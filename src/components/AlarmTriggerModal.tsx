/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Clock, Check, Volume2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AlarmTriggerModal: React.FC = () => {
  const { activeAlarm, dismissAlarm, snoozeAlarm, completeAlarm, t, language } = useApp();

  if (!activeAlarm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border-2 border-indigo-500/30 overflow-hidden text-center p-6 space-y-6">
        {/* Animated Alarm Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-40"></span>
          <div className="relative w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 animate-bounce">
            <Bell className="w-8 h-8" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <Volume2 className="w-3.5 h-3.5" />
            <span>تنبيه مجدول من WorkManager</span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
            {activeAlarm.title}
          </h3>

          {activeAlarm.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {activeAlarm.description}
            </p>
          )}

          <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date(activeAlarm.scheduledTime).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Snooze Options */}
        <div className="space-y-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">خيارات التأجيل (Snooze):</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => snoozeAlarm(5)}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              {t.snooze5}
            </button>
            <button
              onClick={() => snoozeAlarm(10)}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              {t.snooze10}
            </button>
            <button
              onClick={() => snoozeAlarm(30)}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              {t.snooze30}
            </button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={completeAlarm}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{t.markDone}</span>
          </button>

          <button
            onClick={dismissAlarm}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            <span>{t.dismiss}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
