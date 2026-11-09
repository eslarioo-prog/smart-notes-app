/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NotesView } from './components/NotesView';
import { RemindersView } from './components/RemindersView';
import { TasksView } from './components/TasksView';
import { RoomDatabaseInspector } from './components/RoomDatabaseInspector';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { NewReminderModal } from './components/NewReminderModal';
import { AlarmTriggerModal } from './components/AlarmTriggerModal';

const MainLayout: React.FC = () => {
  const { activeScreen, t } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased pb-20 md:pb-8">
      {/* Top Bar adhering to Top Bar Contract */}
      <Header />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeScreen === 'notes' && <NotesView />}
        {activeScreen === 'reminders' && <RemindersView />}
        {activeScreen === 'tasks' && <TasksView />}
        {activeScreen === 'database' && <RoomDatabaseInspector />}
      </main>

      {/* Persistent Mobile Bottom Bar */}
      <MobileBottomNav />

      {/* Floating Modals */}
      <VoiceRecorderModal />
      <NewReminderModal />
      <AlarmTriggerModal />

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.appTitle}</span>
            <span aria-hidden="true">·</span>
            <span>Room Database 2.6.1 + WorkManager 2.9.0</span>
          </div>
          <div className="text-slate-400">
            تخزين محلي IndexedDB غير متصل بالإنترنت مع معالجة صوتية ذكية
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
