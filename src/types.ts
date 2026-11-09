/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly';

export type AlarmSound = 'chime' | 'gentle' | 'bell' | 'radar' | 'marimba';

export interface NoteEntity {
  id: string;
  title: string;
  content: string;
  audioBlobKey?: string; // Key in IndexedDB for blob
  audioUrl?: string; // Object URL or data URL
  audioDuration?: number; // In seconds
  transcription?: string;
  categoryId: string;
  tags: string[];
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  isLocked?: boolean;
  createdAt: number;
  updatedAt: number;
  aiSummary?: string;
}

export interface ReminderEntity {
  id: string;
  noteId?: string;
  title: string;
  description?: string;
  scheduledTime: number; // Unix timestamp in ms
  isCompleted: boolean;
  priority: Priority;
  repeatInterval: RepeatInterval;
  notifySound: AlarmSound;
  isNotified: boolean;
  snoozedUntil?: number;
  createdAt: number;
}

export interface TaskEntity {
  id: string;
  noteId?: string;
  text: string;
  isDone: boolean;
  priority?: Priority;
  dueDate?: number;
  createdAt: number;
}

export interface CategoryEntity {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  iconName: string;
}

export interface WorkManagerJob {
  id: string;
  reminderId: string;
  title: string;
  triggerTime: number;
  status: 'scheduled' | 'triggered' | 'snoozed' | 'dismissed';
  lastRun?: number;
  repeatInterval: RepeatInterval;
}

export type AppNavScreen = 'notes' | 'reminders' | 'tasks' | 'recorder' | 'database' | 'settings';

export type AppLanguage = 'ar' | 'en';
