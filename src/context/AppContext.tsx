/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppLanguage, AppNavScreen, ReminderEntity } from '../types';
import { roomDb } from '../db/roomDatabase';
import { workManager } from '../services/workManagerService';
import { translations } from '../i18n';

interface AppContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  isDark: boolean;
  toggleTheme: () => void;
  activeScreen: AppNavScreen;
  setActiveScreen: (screen: AppNavScreen) => void;
  isRecorderOpen: boolean;
  openRecorder: () => void;
  closeRecorder: () => void;
  isNewReminderOpen: boolean;
  openNewReminder: (noteId?: string, defaultTitle?: string) => void;
  closeNewReminder: () => void;
  activeAlarm: ReminderEntity | null;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes: number) => void;
  completeAlarm: () => void;
  dbRevision: number;
  refreshDb: () => void;
  t: typeof translations.ar;
  reminderDefaultContext: { noteId?: string; defaultTitle?: string };
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('ar');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeScreen, setActiveScreen] = useState<AppNavScreen>('notes');
  const [isRecorderOpen, setIsRecorderOpen] = useState<boolean>(false);
  const [isNewReminderOpen, setIsNewReminderOpen] = useState<boolean>(false);
  const [reminderDefaultContext, setReminderDefaultContext] = useState<{ noteId?: string; defaultTitle?: string }>({});
  const [activeAlarm, setActiveAlarm] = useState<ReminderEntity | null>(null);
  const [dbRevision, setDbRevision] = useState<number>(0);

  // Sync RTL and lang attribute
  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('app_lang', lang);
    } catch {}
  };

  // Sync dark class on documentElement
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('app_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  const refreshDb = () => {
    setDbRevision((prev) => prev + 1);
  };

  useEffect(() => {
    // Initial theme & language setup (Default to Luxury Dark Theme)
    try {
      const savedLang = localStorage.getItem('app_lang') as AppLanguage;
      if (savedLang === 'en' || savedLang === 'ar') {
        setLanguage(savedLang);
      } else {
        setLanguage('ar');
      }

      const savedTheme = localStorage.getItem('app_theme');
      if (savedTheme === 'light') {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
      } else {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }
    } catch {}

    // Init Room Database and WorkManager
    roomDb.init().then(() => {
      refreshDb();
    });

    workManager.init();

    // Listen to Room DB changes
    const unsubDb = roomDb.subscribe('all', () => {
      refreshDb();
    });

    // Listen to WorkManager alarm trigger
    const unsubAlarm = workManager.onAlarmTrigger((reminder) => {
      setActiveAlarm(reminder);
    });

    return () => {
      unsubDb();
      unsubAlarm();
      workManager.stop();
    };
  }, []);

  const openRecorder = () => setIsRecorderOpen(true);
  const closeRecorder = () => setIsRecorderOpen(false);

  const openNewReminder = (noteId?: string, defaultTitle?: string) => {
    setReminderDefaultContext({ noteId, defaultTitle });
    setIsNewReminderOpen(true);
  };
  const closeNewReminder = () => {
    setReminderDefaultContext({});
    setIsNewReminderOpen(false);
  };

  const dismissAlarm = () => {
    workManager.stopAlarmSound();
    setActiveAlarm(null);
  };

  const snoozeAlarm = async (minutes: number) => {
    if (activeAlarm) {
      await workManager.snoozeReminder(activeAlarm.id, minutes);
      setActiveAlarm(null);
      refreshDb();
    }
  };

  const completeAlarm = async () => {
    if (activeAlarm) {
      await workManager.handleReminderCompletion(activeAlarm.id, true);
      setActiveAlarm(null);
      refreshDb();
    }
  };

  const t = translations[language];

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        isDark,
        toggleTheme,
        activeScreen,
        setActiveScreen,
        isRecorderOpen,
        openRecorder,
        closeRecorder,
        isNewReminderOpen,
        openNewReminder,
        closeNewReminder,
        activeAlarm,
        dismissAlarm,
        snoozeAlarm,
        completeAlarm,
        dbRevision,
        refreshDb,
        t,
        reminderDefaultContext,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
