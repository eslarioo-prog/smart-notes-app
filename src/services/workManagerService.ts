/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * WorkManager Service for Scheduling Reminders & Notifications
 * Emulates Android androidx.work.WorkManager with Web Audio synthesis & Notification API
 */

import { AlarmSound, ReminderEntity, WorkManagerJob } from '../types';
import { roomDb } from '../db/roomDatabase';

type AlarmCallback = (reminder: ReminderEntity) => void;

class WorkManagerService {
  private timer: number | null = null;
  private audioCtx: AudioContext | null = null;
  private currentAlarmOscillators: OscillatorNode[] = [];
  private currentGainNode: GainNode | null = null;
  private isAlarmPlaying = false;
  private onAlarmTriggerListeners: Set<AlarmCallback> = new Set();
  private notificationPermission: NotificationPermission = 'default';
  private jobsLog: WorkManagerJob[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  public init() {
    if (this.timer) return;
    
    // Check every second for scheduled reminders
    this.timer = window.setInterval(() => {
      this.checkScheduledReminders();
    }, 1000);

    // Initial check
    this.checkScheduledReminders();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.stopAlarmSound();
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      this.notificationPermission = res;
      return res === 'granted';
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return false;
    }
  }

  public hasNotificationPermission(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  }

  public onAlarmTrigger(callback: AlarmCallback): () => void {
    this.onAlarmTriggerListeners.add(callback);
    return () => {
      this.onAlarmTriggerListeners.delete(callback);
    };
  }

  private constraints = {
    requireCharging: false, // يمكن تفعيله لمحاكاة قيود الشحن الصارمة
    requireNetwork: false,  // يمكن تفعيله لمحاكاة اشتراط الاتصال
    requireBatteryNotLow: true,
  };

  public setConstraints(c: { requireCharging?: boolean; requireNetwork?: boolean; requireBatteryNotLow?: boolean }) {
    this.constraints = { ...this.constraints, ...c };
  }

  public getConstraints() {
    return this.constraints;
  }

  private async checkScheduledReminders() {
    try {
      // التحقق من قيود الاتصال بالشبكة
      if (this.constraints.requireNetwork && typeof navigator !== 'undefined' && !navigator.onLine) {
        return; // تأجيل المهمة لعدم توفر اتصال بالشبكة
      }

      const pending = await roomDb.reminderDao.getPending();
      const now = Date.now();

      for (const reminder of pending) {
        // If scheduled time has passed and has not been notified in this slot
        if (reminder.scheduledTime <= now && !reminder.isNotified) {
          await this.triggerReminder(reminder);
        }
      }
    } catch (e) {
      console.error('WorkManager tick error:', e);
    }
  }

  public async triggerReminder(reminder: ReminderEntity) {
    // Mark as notified in database
    reminder.isNotified = true;
    await roomDb.reminderDao.update(reminder);

    // Add to WorkManager job history
    this.jobsLog.unshift({
      id: `job_${Date.now()}_${reminder.id}`,
      reminderId: reminder.id,
      title: reminder.title,
      triggerTime: Date.now(),
      status: 'triggered',
      lastRun: Date.now(),
      repeatInterval: reminder.repeatInterval,
    });
    if (this.jobsLog.length > 50) this.jobsLog.pop();

    // 1. Play synthesized alarm ringtone
    this.playAlarmSound(reminder.notifySound);

    // 2. Trigger browser notification if allowed
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(reminder.title, {
          body: reminder.description || (reminder.priority === 'urgent' ? '⚠️ تنبيه عاجل يتطلب انتباهك الآن' : 'موعد التنبيه المجدول الآن'),
          tag: reminder.id,
          requireInteraction: reminder.priority === 'urgent' || reminder.priority === 'high',
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('Notification error:', err);
      }
    }

    // 3. Vibration if supported on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 450]);
      } catch {}
    }

    // 4. Notify all UI listeners
    this.onAlarmTriggerListeners.forEach((cb) => cb(reminder));
  }

  /**
   * Synthesize clean, pleasant alert sounds using Web Audio API
   */
  public playAlarmSound(soundType: AlarmSound = 'chime') {
    this.stopAlarmSound();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx();

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.isAlarmPlaying = true;
      const ctx = this.audioCtx;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
      this.currentGainNode = masterGain;

      const scheduleNotes = () => {
        if (!this.isAlarmPlaying) return;

        const startTime = ctx.currentTime;
        let notes: { freq: number; dur: number; delay: number }[] = [];

        switch (soundType) {
          case 'gentle':
            notes = [
              { freq: 440, dur: 0.4, delay: 0 },
              { freq: 554.37, dur: 0.4, delay: 0.25 },
              { freq: 659.25, dur: 0.6, delay: 0.5 },
            ];
            break;
          case 'bell':
            notes = [
              { freq: 880, dur: 0.5, delay: 0 },
              { freq: 1174.66, dur: 0.5, delay: 0.15 },
              { freq: 1318.51, dur: 0.8, delay: 0.3 },
            ];
            break;
          case 'radar':
            notes = [
              { freq: 600, dur: 0.15, delay: 0 },
              { freq: 900, dur: 0.15, delay: 0.15 },
              { freq: 600, dur: 0.15, delay: 0.4 },
              { freq: 900, dur: 0.15, delay: 0.55 },
            ];
            break;
          case 'marimba':
            notes = [
              { freq: 523.25, dur: 0.2, delay: 0 },
              { freq: 659.25, dur: 0.2, delay: 0.12 },
              { freq: 783.99, dur: 0.2, delay: 0.24 },
              { freq: 1046.5, dur: 0.4, delay: 0.36 },
            ];
            break;
          case 'chime':
          default:
            notes = [
              { freq: 587.33, dur: 0.3, delay: 0 },
              { freq: 880, dur: 0.3, delay: 0.2 },
              { freq: 1174.66, dur: 0.6, delay: 0.4 },
            ];
            break;
        }

        notes.forEach(({ freq, dur, delay }) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc.type = soundType === 'radar' ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(freq, startTime + delay);

          noteGain.gain.setValueAtTime(0.001, startTime + delay);
          noteGain.gain.exponentialRampToValueAtTime(0.3, startTime + delay + 0.04);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + delay + dur);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime + delay);
          osc.stop(startTime + delay + dur + 0.05);

          this.currentAlarmOscillators.push(osc);
        });

        // Loop after 2.8 seconds if not dismissed
        if (this.isAlarmPlaying) {
          window.setTimeout(() => {
            if (this.isAlarmPlaying) {
              scheduleNotes();
            }
          }, 2800);
        }
      };

      scheduleNotes();
    } catch (e) {
      console.warn('Audio synthesis error:', e);
    }
  }

  public previewSound(soundType: AlarmSound) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      gain.connect(ctx.destination);

      let freqs = [523.25, 659.25, 783.99];
      if (soundType === 'bell') freqs = [880, 1174.66];
      if (soundType === 'radar') freqs = [600, 900, 600];
      if (soundType === 'gentle') freqs = [440, 554.37];
      if (soundType === 'marimba') freqs = [523.25, 783.99, 1046.5];

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const nGain = ctx.createGain();
        osc.frequency.value = freq;
        nGain.gain.setValueAtTime(0.01, ctx.currentTime + i * 0.15);
        nGain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.15 + 0.03);
        nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
        osc.connect(nGain);
        nGain.connect(gain);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.35);
      });
    } catch {}
  }

  public stopAlarmSound() {
    this.isAlarmPlaying = false;
    this.currentAlarmOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.currentAlarmOscillators = [];
    if (this.currentGainNode) {
      try {
        this.currentGainNode.disconnect();
      } catch {}
      this.currentGainNode = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  /**
   * Reschedule or mark reminder completed with support for repeats
   */
  public async handleReminderCompletion(reminderId: string, markDone = true) {
    this.stopAlarmSound();
    const all = await roomDb.reminderDao.getAll();
    const reminder = all.find((r) => r.id === reminderId);
    if (!reminder) return;

    if (markDone && reminder.repeatInterval !== 'none') {
      // Calculate next occurrence
      let nextTime = reminder.scheduledTime;
      const dayMs = 24 * 60 * 60 * 1000;

      if (reminder.repeatInterval === 'daily') {
        nextTime += dayMs;
      } else if (reminder.repeatInterval === 'weekly') {
        nextTime += 7 * dayMs;
      } else if (reminder.repeatInterval === 'weekdays') {
        const date = new Date(nextTime);
        const day = date.getDay();
        // If Friday (5), skip to Sunday or Monday
        nextTime += (day === 5 ? 3 : day === 6 ? 2 : 1) * dayMs;
      } else if (reminder.repeatInterval === 'monthly') {
        const date = new Date(nextTime);
        date.setMonth(date.getMonth() + 1);
        nextTime = date.getTime();
      }

      reminder.scheduledTime = nextTime;
      reminder.isNotified = false;
      reminder.isCompleted = false;
      await roomDb.reminderDao.update(reminder);
    } else {
      await roomDb.reminderDao.markCompleted(reminderId, markDone);
    }
  }

  public async snoozeReminder(reminderId: string, minutes: number) {
    this.stopAlarmSound();
    await roomDb.reminderDao.snooze(reminderId, minutes);
  }

  public getJobsLog(): WorkManagerJob[] {
    return this.jobsLog;
  }
}

export const workManager = new WorkManagerService();
