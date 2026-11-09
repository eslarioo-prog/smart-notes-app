/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Room Database Engine for Web (IndexedDB + In-Memory Reactive DAO Layer)
 * Emulates Android androidx.room.RoomDatabase with DAOs and Reactive Flows
 */

import { CategoryEntity, NoteEntity, ReminderEntity, TaskEntity } from '../types';

const DB_NAME = 'smart_voice_room_db';
const DB_VERSION = 1;

export const DEFAULT_CATEGORIES: CategoryEntity[] = [
  { id: 'general', name: 'General', nameAr: 'عام', color: '#6366f1', iconName: 'Folder' },
  { id: 'work', name: 'Work', nameAr: 'العمل', color: '#0ea5e9', iconName: 'Briefcase' },
  { id: 'personal', name: 'Personal', nameAr: 'شخصي', color: '#ec4899', iconName: 'User' },
  { id: 'ideas', name: 'Ideas & Voice', nameAr: 'أفكار وتسجيلات', color: '#8b5cf6', iconName: 'Sparkles' },
  { id: 'health', name: 'Health & Appointments', nameAr: 'صحة ومواعيد', color: '#10b981', iconName: 'Heart' },
  { id: 'shopping', name: 'Shopping', nameAr: 'التسوق والمهام', color: '#f59e0b', iconName: 'ShoppingCart' },
];

class RoomDatabase {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.listeners.set('notes', new Set());
    this.listeners.set('reminders', new Set());
    this.listeners.set('tasks', new Set());
    this.listeners.set('categories', new Set());
    this.listeners.set('all', new Set());
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to LocalStorage memory storage');
        this.isInitialized = true;
        this.ensureDefaultData();
        resolve();
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Notes Store
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('createdAt', 'createdAt', { unique: false });
          noteStore.createIndex('categoryId', 'categoryId', { unique: false });
          noteStore.createIndex('isPinned', 'isPinned', { unique: false });
          noteStore.createIndex('isArchived', 'isArchived', { unique: false });
        }

        // Reminders Store
        if (!db.objectStoreNames.contains('reminders')) {
          const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
          reminderStore.createIndex('scheduledTime', 'scheduledTime', { unique: false });
          reminderStore.createIndex('isCompleted', 'isCompleted', { unique: false });
          reminderStore.createIndex('priority', 'priority', { unique: false });
        }

        // Tasks Store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('isDone', 'isDone', { unique: false });
          taskStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Categories Store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // Audio Blobs Store
        if (!db.objectStoreNames.contains('audio_blobs')) {
          db.createObjectStore('audio_blobs', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitialized = true;
        await this.ensureDefaultData();
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error('Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
        this.isInitialized = true;
        this.ensureDefaultData();
        resolve();
      };
    });
  }

  private notify(table: 'notes' | 'reminders' | 'tasks' | 'categories' | 'all') {
    this.listeners.get(table)?.forEach((cb) => cb());
    this.listeners.get('all')?.forEach((cb) => cb());
  }

  public subscribe(table: 'notes' | 'reminders' | 'tasks' | 'categories' | 'all', callback: () => void): () => void {
    const tableListeners = this.listeners.get(table);
    tableListeners?.add(callback);
    return () => {
      tableListeners?.delete(callback);
    };
  }

  // Fallback storage using localStorage
  private getLocal<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(`room_${key}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setLocal<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(`room_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  }

  private async ensureDefaultData() {
    const cats = await this.categoryDao.getAll();
    if (cats.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await this.categoryDao.insert(cat);
      }
    }

    const notes = await this.noteDao.getAll();
    if (notes.length === 0) {
      // Seed initial helpful notes
      const now = Date.now();
      const sampleNotes: NoteEntity[] = [
        {
          id: 'note_starter_1',
          title: 'أهلاً بك في مذكراتي الصوتية والتذكيرات',
          content: 'تطبيق متكامل مستوحى من بنية Room Database و WorkManager في نظام Android. يمكنك تسجيل مذكرات صوتية والاستماع إليها والتحكم في سرعتها، كما يمكنك جدولة تنبيهات ذكية وتفعيل الإشعارات وتحديد الأولويات والمهام.',
          categoryId: 'ideas',
          tags: ['ترحيب', 'صوت', 'دليل'],
          color: '#e0e7ff',
          isPinned: true,
          isArchived: false,
          isDeleted: false,
          audioDuration: 12,
          transcription: 'مرحباً! يمكنك الضغط على زر الميكروفون لبدء تسجيل صوتك الفوري وتحويله تلقائياً لمهام مجدولة وتنبيهات.',
          createdAt: now - 3600000,
          updatedAt: now - 3600000,
          aiSummary: 'مذكرة ترحيبية تشرح تسجيل الصوت وجدولة التنبيهات مع بنية Room Database و WorkManager.',
        },
        {
          id: 'note_starter_2',
          title: 'موعد فحص طبي وإجراء التحاليل',
          content: 'حجز عيادة الباطنة والتحاليل الدورية صباح الغد. يجب الحضور صائماً قبل موعد الزيارة بساعتين مع إحضار الفحوصات القديمة.',
          categoryId: 'health',
          tags: ['صحة', 'فحوصات'],
          color: '#d1fae5',
          isPinned: true,
          isArchived: false,
          isDeleted: false,
          createdAt: now - 7200000,
          updatedAt: now - 7200000,
        },
        {
          id: 'note_starter_3',
          title: 'Weekly Sprint & Project Launch',
          content: 'Prepare sprint backlog, test offline Room DB persistence, verify WorkManager scheduled alarms, and review UI performance.',
          categoryId: 'work',
          tags: ['dev', 'android', 'launch'],
          color: '#e0f2fe',
          isPinned: false,
          isArchived: false,
          isDeleted: false,
          createdAt: now - 14400000,
          updatedAt: now - 14400000,
        },
      ];

      for (const n of sampleNotes) {
        await this.noteDao.insert(n);
      }

      // Seed initial reminders
      const sampleReminders: ReminderEntity[] = [
        {
          id: 'rem_1',
          noteId: 'note_starter_2',
          title: 'موعد العيادة والتحاليل الطبية',
          description: 'حضور صائم قبل الموعد بنصف ساعة',
          scheduledTime: now + 2 * 3600000, // 2 hours from now
          isCompleted: false,
          priority: 'urgent',
          repeatInterval: 'none',
          notifySound: 'bell',
          isNotified: false,
          createdAt: now,
        },
        {
          id: 'rem_2',
          noteId: 'note_starter_1',
          title: 'مراجعة الملاحظات الصوتية وتفريغ الأفكار',
          description: 'جلسة التخطيط اليومية لمدة 15 دقيقة',
          scheduledTime: now + 5 * 3600000,
          isCompleted: false,
          priority: 'medium',
          repeatInterval: 'daily',
          notifySound: 'chime',
          isNotified: false,
          createdAt: now,
        },
        {
          id: 'rem_3',
          title: 'شرب لتر ماء وأخذ استراحة عين',
          description: 'تذكير دوري لسلامة الصحة أثناء العمل',
          scheduledTime: now + 30 * 60000,
          isCompleted: false,
          priority: 'low',
          repeatInterval: 'daily',
          notifySound: 'gentle',
          isNotified: false,
          createdAt: now,
        },
      ];

      for (const r of sampleReminders) {
        await this.reminderDao.insert(r);
      }

      // Seed initial tasks
      const sampleTasks: TaskEntity[] = [
        { id: 'task_1', noteId: 'note_starter_1', text: 'تجربة تسجيل مذكرة صوتية بالميكروفون', isDone: false, priority: 'high', createdAt: now },
        { id: 'task_2', noteId: 'note_starter_1', text: 'اختبار رنة التنبيه المجدولة في WorkManager', isDone: false, priority: 'urgent', createdAt: now },
        { id: 'task_3', noteId: 'note_starter_2', text: 'طباعة نتائج الفحوصات الطبية القديمة', isDone: true, priority: 'medium', createdAt: now },
        { id: 'task_4', text: 'شراء بطاريات ومستلزمات مكتبية', isDone: false, priority: 'low', createdAt: now },
      ];

      for (const t of sampleTasks) {
        await this.taskDao.insert(t);
      }
    }
  }

  // --- Note DAO ---
  public noteDao = {
    getAll: async (): Promise<NoteEntity[]> => {
      if (!this.db) {
        return this.getLocal<NoteEntity>('notes').sort((a, b) => b.createdAt - a.createdAt);
      }
      return new Promise((resolve) => {
        const tx = this.db!.transaction('notes', 'readonly');
        const store = tx.objectStore('notes');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as NoteEntity[]) || [];
          resolve(list.sort((a, b) => b.createdAt - a.createdAt));
        };
        req.onerror = () => resolve(this.getLocal<NoteEntity>('notes'));
      });
    },

    getById: async (id: string): Promise<NoteEntity | null> => {
      const all = await this.noteDao.getAll();
      return all.find((n) => n.id === id) || null;
    },

    insert: async (note: NoteEntity): Promise<void> => {
      if (!this.db) {
        const list = this.getLocal<NoteEntity>('notes');
        const existingIdx = list.findIndex((n) => n.id === note.id);
        if (existingIdx >= 0) list[existingIdx] = note;
        else list.unshift(note);
        this.setLocal('notes', list);
        this.notify('notes');
        return;
      }

      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction('notes', 'readwrite');
        const store = tx.objectStore('notes');
        store.put(note);
        tx.oncomplete = () => {
          this.notify('notes');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },

    update: async (note: NoteEntity): Promise<void> => {
      await this.noteDao.insert(note);
    },

    delete: async (id: string): Promise<void> => {
      if (!this.db) {
        const list = this.getLocal<NoteEntity>('notes').filter((n) => n.id !== id);
        this.setLocal('notes', list);
        this.notify('notes');
        return;
      }
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction('notes', 'readwrite');
        const store = tx.objectStore('notes');
        store.delete(id);
        tx.oncomplete = () => {
          this.notify('notes');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },
  };

  // --- Reminder DAO ---
  public reminderDao = {
    getAll: async (): Promise<ReminderEntity[]> => {
      if (!this.db) {
        return this.getLocal<ReminderEntity>('reminders').sort((a, b) => a.scheduledTime - b.scheduledTime);
      }
      return new Promise((resolve) => {
        const tx = this.db!.transaction('reminders', 'readonly');
        const store = tx.objectStore('reminders');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as ReminderEntity[]) || [];
          resolve(list.sort((a, b) => a.scheduledTime - b.scheduledTime));
        };
        req.onerror = () => resolve(this.getLocal<ReminderEntity>('reminders'));
      });
    },

    getPending: async (): Promise<ReminderEntity[]> => {
      const all = await this.reminderDao.getAll();
      return all.filter((r) => !r.isCompleted);
    },

    insert: async (reminder: ReminderEntity): Promise<void> => {
      if (!this.db) {
        const list = this.getLocal<ReminderEntity>('reminders');
        const existingIdx = list.findIndex((r) => r.id === reminder.id);
        if (existingIdx >= 0) list[existingIdx] = reminder;
        else list.push(reminder);
        this.setLocal('reminders', list);
        this.notify('reminders');
        return;
      }

      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction('reminders', 'readwrite');
        const store = tx.objectStore('reminders');
        store.put(reminder);
        tx.oncomplete = () => {
          this.notify('reminders');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },

    update: async (reminder: ReminderEntity): Promise<void> => {
      await this.reminderDao.insert(reminder);
    },

    delete: async (id: string): Promise<void> => {
      if (!this.db) {
        const list = this.getLocal<ReminderEntity>('reminders').filter((r) => r.id !== id);
        this.setLocal('reminders', list);
        this.notify('reminders');
        return;
      }
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction('reminders', 'readwrite');
        const store = tx.objectStore('reminders');
        store.delete(id);
        tx.oncomplete = () => {
          this.notify('reminders');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },

    markCompleted: async (id: string, isCompleted = true): Promise<void> => {
      const all = await this.reminderDao.getAll();
      const target = all.find((r) => r.id === id);
      if (target) {
        target.isCompleted = isCompleted;
        await this.reminderDao.update(target);
      }
    },

    snooze: async (id: string, additionalMinutes: number): Promise<void> => {
      const all = await this.reminderDao.getAll();
      const target = all.find((r) => r.id === id);
      if (target) {
        target.scheduledTime = Date.now() + additionalMinutes * 60 * 1000;
        target.isNotified = false;
        target.snoozedUntil = target.scheduledTime;
        await this.reminderDao.update(target);
      }
    },
  };

  // --- Task DAO ---
  public taskDao = {
    getAll: async (): Promise<TaskEntity[]> => {
      if (!this.db) {
        return this.getLocal<TaskEntity>('tasks').sort((a, b) => b.createdAt - a.createdAt);
      }
      return new Promise((resolve) => {
        const tx = this.db!.transaction('tasks', 'readonly');
        const store = tx.objectStore('tasks');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as TaskEntity[]) || [];
          resolve(list.sort((a, b) => b.createdAt - a.createdAt));
        };
        req.onerror = () => resolve(this.getLocal<TaskEntity>('tasks'));
      });
    },

    insert: async (task: TaskEntity): Promise<void> => {
      if (!this.db) {
        const list = this.getLocal<TaskEntity>('tasks');
        const existingIdx = list.findIndex((t) => t.id === task.id);
        if (existingIdx >= 0) list[existingIdx] = task;
        else list.unshift(task);
        this.setLocal('tasks', list);
        this.notify('tasks');
        return;
      }

      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        store.put(task);
        tx.oncomplete = () => {
          this.notify('tasks');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },

    toggle: async (id: string): Promise<boolean> => {
      const all = await this.taskDao.getAll();
      const task = all.find((t) => t.id === id);
      if (task) {
        task.isDone = !task.isDone;
        await this.taskDao.insert(task);
        return task.isDone;
      }
      return false;
    },

    delete: async (id: string): Promise<void> => {
      if (!this.db) {
        const list = this.getLocal<TaskEntity>('tasks').filter((t) => t.id !== id);
        this.setLocal('tasks', list);
        this.notify('tasks');
        return;
      }
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        store.delete(id);
        tx.oncomplete = () => {
          this.notify('tasks');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },
  };

  // --- Category DAO ---
  public categoryDao = {
    getAll: async (): Promise<CategoryEntity[]> => {
      if (!this.db) {
        const local = this.getLocal<CategoryEntity>('categories');
        return local.length > 0 ? local : DEFAULT_CATEGORIES;
      }
      return new Promise((resolve) => {
        const tx = this.db!.transaction('categories', 'readonly');
        const store = tx.objectStore('categories');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as CategoryEntity[]) || [];
          resolve(list.length > 0 ? list : DEFAULT_CATEGORIES);
        };
        req.onerror = () => resolve(DEFAULT_CATEGORIES);
      });
    },

    insert: async (category: CategoryEntity): Promise<void> => {
      if (!this.db) {
        const list = this.getLocal<CategoryEntity>('categories');
        const existingIdx = list.findIndex((c) => c.id === category.id);
        if (existingIdx >= 0) list[existingIdx] = category;
        else list.push(category);
        this.setLocal('categories', list);
        this.notify('categories');
        return;
      }

      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction('categories', 'readwrite');
        const store = tx.objectStore('categories');
        store.put(category);
        tx.oncomplete = () => {
          this.notify('categories');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },
  };

  // --- Audio Blob Storage ---
  public async saveAudioBlob(id: string, blob: Blob): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('audio_blobs', 'readwrite');
      const store = tx.objectStore('audio_blobs');
      store.put({ id, blob, createdAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAudioBlob(id: string): Promise<Blob | null> {
    if (!this.db) return null;
    return new Promise((resolve) => {
      const tx = this.db!.transaction('audio_blobs', 'readonly');
      const store = tx.objectStore('audio_blobs');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => resolve(null);
    });
  }

  // --- Export and Raw DB stats for Android Room Inspector ---
  public async getDatabaseStats() {
    const notes = await this.noteDao.getAll();
    const reminders = await this.reminderDao.getAll();
    const tasks = await this.taskDao.getAll();
    const voiceNotes = notes.filter((n) => !!n.audioDuration || !!n.audioUrl || !!n.audioBlobKey);
    const pendingReminders = reminders.filter((r) => !r.isCompleted);

    return {
      name: DB_NAME,
      version: DB_VERSION,
      tables: ['notes', 'reminders', 'tasks', 'categories', 'audio_blobs'],
      counts: {
        notes: notes.length,
        voiceNotes: voiceNotes.length,
        reminders: reminders.length,
        pendingReminders: pendingReminders.length,
        tasks: tasks.length,
      },
    };
  }

  public async exportJsonBackup(): Promise<string> {
    const notes = await this.noteDao.getAll();
    const reminders = await this.reminderDao.getAll();
    const tasks = await this.taskDao.getAll();
    const categories = await this.categoryDao.getAll();

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: DB_VERSION,
        data: { notes, reminders, tasks, categories },
      },
      null,
      2
    );
  }

  public async importJsonBackup(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.data) {
        if (Array.isArray(parsed.data.notes)) {
          for (const n of parsed.data.notes) await this.noteDao.insert(n);
        }
        if (Array.isArray(parsed.data.reminders)) {
          for (const r of parsed.data.reminders) await this.reminderDao.insert(r);
        }
        if (Array.isArray(parsed.data.tasks)) {
          for (const t of parsed.data.tasks) await this.taskDao.insert(t);
        }
        this.notify('all');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Backup import error:', e);
      return false;
    }
  }

  public async clearAllAndReset(): Promise<void> {
    if (this.db) {
      const stores = ['notes', 'reminders', 'tasks', 'categories', 'audio_blobs'];
      for (const s of stores) {
        const tx = this.db.transaction(s, 'readwrite');
        tx.objectStore(s).clear();
      }
    }
    localStorage.removeItem('room_notes');
    localStorage.removeItem('room_reminders');
    localStorage.removeItem('room_tasks');
    localStorage.removeItem('room_categories');
    await this.ensureDefaultData();
    this.notify('all');
  }
}

export const roomDb = new RoomDatabase();
