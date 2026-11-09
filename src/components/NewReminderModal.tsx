/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, Volume2, X, Check, Repeat, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { roomDb } from '../db/roomDatabase';
import { workManager } from '../services/workManagerService';
import { AlarmSound, Priority, ReminderEntity, RepeatInterval } from '../types';

export const NewReminderModal: React.FC = () => {
  const { isNewReminderOpen, closeNewReminder, reminderDefaultContext, refreshDb, t, language } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<Priority>('high');
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>('none');
  const [notifySound, setNotifySound] = useState<AlarmSound>('chime');

  useEffect(() => {
    if (isNewReminderOpen) {
      setTitle(reminderDefaultContext.defaultTitle || '');
      setDescription('');
      
      // Default to 1 hour from now
      const target = new Date(Date.now() + 60 * 60 * 1000);
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, '0');
      const dd = String(target.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);

      const hh = String(target.getHours()).padStart(2, '0');
      const min = String(target.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${min}`);

      setPriority('high');
      setRepeatInterval('none');
      setNotifySound('chime');
    }
  }, [isNewReminderOpen, reminderDefaultContext]);

  if (!isNewReminderOpen) return null;

  const handlePreviewSound = (s: AlarmSound) => {
    setNotifySound(s);
    workManager.previewSound(s);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    const scheduledDate = new Date(`${date}T${time}:00`);
    const scheduledTime = scheduledDate.getTime();

    const newReminder: ReminderEntity = {
      id: `rem_${Date.now()}`,
      noteId: reminderDefaultContext.noteId,
      title: title.trim(),
      description: description.trim() || undefined,
      scheduledTime,
      isCompleted: false,
      priority,
      repeatInterval,
      notifySound,
      isNotified: false,
      createdAt: Date.now(),
    };

    await roomDb.reminderDao.insert(newReminder);
    refreshDb();
    closeNewReminder();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t.addReminder}
              </h2>
              <span className="text-xs text-slate-500">Android WorkManager Task Scheduler</span>
            </div>
          </div>
          <button
            onClick={closeNewReminder}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.title} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: موعد الاجتماع أو مراجعة الطبيب..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.content}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل التنبيه أو ملاحظات إضافية..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                التاريخ *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                الوقت *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.priority}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'low', label: t.priorityLow, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
                { id: 'medium', label: t.priorityMedium, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
                { id: 'high', label: t.priorityHigh, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
                { id: 'urgent', label: t.priorityUrgent, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPriority(p.id as Priority)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border ${
                    priority === p.id
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  } ${p.color}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" />
              {t.repeat}
            </label>
            <select
              value={repeatInterval}
              onChange={(e) => setRepeatInterval(e.target.value as RepeatInterval)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">{t.repeatNone}</option>
              <option value="daily">{t.repeatDaily}</option>
              <option value="weekdays">{t.repeatWeekdays}</option>
              <option value="weekly">{t.repeatWeekly}</option>
              <option value="monthly">{t.repeatMonthly}</option>
            </select>
          </div>

          {/* Alarm Ringtone Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                {t.alarmSound} (توليد صوتي لحظي)
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400">انقر للتجربة</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'chime', label: t.soundChime },
                { id: 'gentle', label: t.soundGentle },
                { id: 'bell', label: t.soundBell },
                { id: 'radar', label: t.soundRadar },
                { id: 'marimba', label: t.soundMarimba },
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => handlePreviewSound(s.id as AlarmSound)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-all border ${
                    notifySound === s.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate">{s.label}</span>
                  <Volume2 className="w-3 h-3 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeNewReminder}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>جدولة التنبيه في WorkManager</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
