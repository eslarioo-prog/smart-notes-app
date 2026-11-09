/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, Check, Volume2, Plus, AlertCircle, RefreshCw, Trash2, Repeat, BellRing, ArrowUpRight } from 'lucide-react';
import { ReminderEntity } from '../types';
import { roomDb } from '../db/roomDatabase';
import { workManager } from '../services/workManagerService';
import { useApp } from '../context/AppContext';

export const RemindersView: React.FC = () => {
  const { dbRevision, refreshDb, openNewReminder, language, t } = useApp();
  const [reminders, setReminders] = useState<ReminderEntity[]>([]);
  const [filterTab, setFilterTab] = useState<'upcoming' | 'today' | 'completed'>('upcoming');
  const [hasNotifPermission, setHasNotifPermission] = useState(workManager.hasNotificationPermission());

  useEffect(() => {
    let isMounted = true;
    roomDb.reminderDao.getAll().then((list) => {
      if (isMounted) setReminders(list);
    });
    return () => {
      isMounted = false;
    };
  }, [dbRevision]);

  const handleRequestNotif = async () => {
    const granted = await workManager.requestNotificationPermission();
    setHasNotifPermission(granted);
  };

  const handleToggleComplete = async (reminder: ReminderEntity) => {
    await workManager.handleReminderCompletion(reminder.id, !reminder.isCompleted);
    refreshDb();
  };

  const handleSnooze = async (id: string, mins: number) => {
    await workManager.snoozeReminder(id, mins);
    refreshDb();
  };

  const handleDelete = async (id: string) => {
    await roomDb.reminderDao.delete(id);
    refreshDb();
  };

  const handlePreviewSound = (s: any) => {
    workManager.previewSound(s);
  };

  // Filter logic
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const upcomingReminders = reminders.filter((r) => !r.isCompleted && r.scheduledTime >= now);
  const todayReminders = reminders.filter((r) => !r.isCompleted && r.scheduledTime >= startOfToday.getTime() && r.scheduledTime <= endOfToday.getTime());
  const completedReminders = reminders.filter((r) => r.isCompleted);

  let displayedReminders = upcomingReminders;
  if (filterTab === 'today') displayedReminders = todayReminders;
  if (filterTab === 'completed') displayedReminders = completedReminders;

  return (
    <div className="space-y-6">
      {/* WorkManager System Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                WorkManager Background Service
              </span>
            </div>
            <h3 className="text-xl font-bold">جدولة التنبيهات وإشعارات النظام</h3>
            <p className="text-xs text-indigo-200 max-w-xl">
              تتم مراقبة المواعيد لحظياً في الخلفية باستخدام محرك WorkManager ونظام التوليد الصوتي Web Audio API مع دعم كامل للإشعارات المحلية.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!hasNotifPermission ? (
              <button
                onClick={handleRequestNotif}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-950 bg-amber-300 hover:bg-amber-400 rounded-xl transition-all shadow-md"
              >
                <BellRing className="w-4 h-4" />
                <span>{t.enableNotifications}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" />
                <span>{t.notificationsEnabled}</span>
              </div>
            )}

            <button
              onClick={() => openNewReminder()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addReminder}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Functional Button Controls §1.A) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setFilterTab('upcoming')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterTab === 'upcoming'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.upcomingAlerts} ({upcomingReminders.length})
          </button>
          <button
            onClick={() => setFilterTab('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterTab === 'today'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.todayAlerts} ({todayReminders.length})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.completedAlerts} ({completedReminders.length})
          </button>
        </div>
      </div>

      {/* Reminders List */}
      {displayedReminders.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t.noReminders}
          </h4>
          <p className="text-xs text-slate-500">
            يمكنك جدولة تنبيه جديد مع تحديد الوقت والنغمة الصوتية والتكرار.
          </p>
          <button
            onClick={() => openNewReminder()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>جدولة أول تنبيه</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedReminders.map((rem) => {
            const dateObj = new Date(rem.scheduledTime);
            const isPast = rem.scheduledTime < now && !rem.isCompleted;

            return (
              <div
                key={rem.id}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
                  isPast
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                    : rem.isCompleted
                    ? 'border-slate-200 dark:border-slate-800 opacity-60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                {/* Left zone: Checkbox & Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(rem)}
                    className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      rem.isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-600'
                    }`}
                  >
                    {rem.isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-semibold leading-tight ${
                          rem.isCompleted
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {rem.title}
                      </h4>

                      {/* Priority Tag */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rem.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : rem.priority === 'high'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : rem.priority === 'medium'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {rem.priority === 'urgent'
                          ? t.priorityUrgent
                          : rem.priority === 'high'
                          ? t.priorityHigh
                          : rem.priority === 'medium'
                          ? t.priorityMedium
                          : t.priorityLow}
                      </span>

                      {rem.repeatInterval !== 'none' && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          <Repeat className="w-3 h-3" />
                          <span>
                            {rem.repeatInterval === 'daily'
                              ? t.repeatDaily
                              : rem.repeatInterval === 'weekly'
                              ? t.repeatWeekly
                              : rem.repeatInterval === 'weekdays'
                              ? t.repeatWeekdays
                              : t.repeatMonthly}
                          </span>
                        </span>
                      )}
                    </div>

                    {rem.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {rem.description}
                      </p>
                    )}

                    {/* Unboxed Metadata: Date, Time & Sound (§1.A) */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {dateObj.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {dateObj.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <button
                        onClick={() => handlePreviewSound(rem.notifySound)}
                        className="hover:text-indigo-600 flex items-center gap-0.5"
                        title="تجربة النغمة"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{rem.notifySound}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right zone: Snooze & Delete */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!rem.isCompleted && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSnooze(rem.id, 5)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        +5 د
                      </button>
                      <button
                        onClick={() => handleSnooze(rem.id, 15)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        +15 د
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleDelete(rem.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="حذف التنبيه"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
