/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic, Moon, Sun, Globe, BellRing } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { workManager } from '../services/workManagerService';

export const Header: React.FC = () => {
  const { language, setLanguage, isDark, toggleTheme, activeScreen, setActiveScreen, openRecorder, t } = useApp();
  const [hasNotifPermission, setHasNotifPermission] = React.useState(workManager.hasNotificationPermission());

  const handleRequestNotif = async () => {
    const granted = await workManager.requestNotificationPermission();
    setHasNotifPermission(granted);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0D1424]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222E46]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveScreen('notes')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-amber-100 whitespace-nowrap block">
                {t.appTitle}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveScreen('notes')}
            className={`whitespace-nowrap transition-colors hover:text-amber-600 dark:hover:text-amber-300 py-1 ${
              activeScreen === 'notes'
                ? 'text-amber-600 dark:text-amber-400 font-bold border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.navNotes}
          </button>
          <button
            onClick={() => setActiveScreen('reminders')}
            className={`whitespace-nowrap transition-colors hover:text-amber-600 dark:hover:text-amber-300 py-1 ${
              activeScreen === 'reminders'
                ? 'text-amber-600 dark:text-amber-400 font-bold border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.navReminders}
          </button>
          <button
            onClick={() => setActiveScreen('tasks')}
            className={`whitespace-nowrap transition-colors hover:text-amber-600 dark:hover:text-amber-300 py-1 ${
              activeScreen === 'tasks'
                ? 'text-amber-600 dark:text-amber-400 font-bold border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.navTasks}
          </button>
          <button
            onClick={() => setActiveScreen('database')}
            className={`whitespace-nowrap transition-colors hover:text-amber-600 dark:hover:text-amber-300 py-1 ${
              activeScreen === 'database'
                ? 'text-amber-600 dark:text-amber-400 font-bold border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.navDatabase}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Utility Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!hasNotifPermission && (
            <button
              onClick={handleRequestNotif}
              title={t.enableNotifications}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 dark:bg-amber-950/60 rounded-lg border border-amber-600/40 hover:bg-amber-900/40 transition-colors whitespace-nowrap"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{t.enableNotifications}</span>
            </button>
          )}

          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
            title="Switch Language"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t.themeToggle}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
