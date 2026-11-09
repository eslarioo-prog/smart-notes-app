/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, Bell, CheckSquare, Database, Mic } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MobileBottomNav: React.FC = () => {
  const { activeScreen, setActiveScreen, openRecorder, t } = useApp();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0D1424]/95 backdrop-blur-lg border-t border-slate-200 dark:border-[#222E46] pb-safe">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-2">
        {/* Notes */}
        <button
          onClick={() => setActiveScreen('notes')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            activeScreen === 'notes'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight truncate max-w-[60px]">{t.navNotes}</span>
        </button>

        {/* Reminders */}
        <button
          onClick={() => setActiveScreen('reminders')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            activeScreen === 'reminders'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight truncate max-w-[60px]">{t.navReminders}</span>
        </button>

        {/* Center Floating Mic Action */}
        <div className="flex items-center justify-center -mt-5">
          <button
            onClick={openRecorder}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 hover:brightness-105 active:scale-95 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all focus:outline-none focus:ring-4 focus:ring-amber-400/40"
            aria-label="Record voice memo"
          >
            <Mic className="w-6 h-6 stroke-[2.5] animate-pulse" />
          </button>
        </div>

        {/* Tasks */}
        <button
          onClick={() => setActiveScreen('tasks')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            activeScreen === 'tasks'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight truncate max-w-[60px]">{t.navTasks}</span>
        </button>

        {/* Room DB */}
        <button
          onClick={() => setActiveScreen('database')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            activeScreen === 'database'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight truncate max-w-[60px]">Room DB</span>
        </button>
      </div>
    </div>
  );
};
