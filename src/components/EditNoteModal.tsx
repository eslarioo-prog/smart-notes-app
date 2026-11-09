/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Pin, Tag, Sparkles, Fingerprint, Lock } from 'lucide-react';
import { NoteEntity } from '../types';
import { roomDb, DEFAULT_CATEGORIES } from '../db/roomDatabase';
import { useApp } from '../context/AppContext';
import { analyzeVoiceNote } from '../services/aiService';

interface EditNoteModalProps {
  note: NoteEntity | null;
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_OPTIONS = ['#e0e7ff', '#d1fae5', '#fef3c7', '#fee2e2', '#f3e8ff', '#e0f2fe', '#f1f5f9'];

export const EditNoteModal: React.FC<EditNoteModalProps> = ({ note, isOpen, onClose }) => {
  const { refreshDb, language, t } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('general');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState('#e0e7ff');
  const [isPinned, setIsPinned] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setCategoryId(note.categoryId || 'general');
      setTags(note.tags || []);
      setColor(note.color || '#e0e7ff');
      setIsPinned(note.isPinned || false);
      setIsLocked(note.isLocked || false);
    } else {
      setTitle('');
      setContent('');
      setCategoryId('general');
      setTags([]);
      setColor('#e0e7ff');
      setIsPinned(false);
      setIsLocked(false);
    }
  }, [note, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tToRemove: string) => {
    setTags(tags.filter((t) => t !== tToRemove));
  };

  const handleRunAiEnhance = async () => {
    if (!content.trim()) return;
    setIsAiSummarizing(true);
    try {
      const res = await analyzeVoiceNote(content, language);
      if (!title.trim() && res.title) setTitle(res.title);
      if (res.tags && res.tags.length > 0) {
        setTags((prev) => Array.from(new Set([...prev, ...res.tags])));
      }
      if (res.category) {
        const cat = DEFAULT_CATEGORIES.find((c) => c.id === res.category);
        if (cat) setCategoryId(cat.id);
      }
    } catch {}
    setIsAiSummarizing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const now = Date.now();
    const updatedNote: NoteEntity = {
      id: note ? note.id : `note_${now}`,
      title: title.trim() || (language === 'ar' ? 'ملاحظة بدون عنوان' : 'Untitled Note'),
      content: content.trim(),
      categoryId,
      tags,
      color,
      isPinned,
      isLocked,
      isArchived: note?.isArchived || false,
      isDeleted: false,
      audioBlobKey: note?.audioBlobKey,
      audioUrl: note?.audioUrl,
      audioDuration: note?.audioDuration,
      transcription: note?.transcription,
      aiSummary: note?.aiSummary,
      createdAt: note?.createdAt || now,
      updatedAt: now,
    };

    await roomDb.noteDao.insert(updatedNote);
    refreshDb();
    onClose();
  };

  const handleDelete = async () => {
    if (note) {
      await roomDb.noteDao.delete(note.id);
      refreshDb();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {note ? (language === 'ar' ? 'تعديل الملاحظة' : 'Edit Note') : t.newNote}
            </h2>
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-lg transition-colors ${
                isPinned
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="تثبيت في الأعلى"
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* زر الحماية بالبصمة البيومترية */}
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs font-semibold ${
                isLocked
                  ? 'text-amber-500 bg-amber-500/10 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent'
              }`}
              title={isLocked ? 'محمية بالبصمة (انقر لإلغاء القفل)' : 'حماية وقفل الملاحظة بالبصمة'}
            >
              <Fingerprint className="w-4 h-4" />
              <span className="text-[11px]">{isLocked ? 'مقفلة بالبصمة' : 'قفل بالبصمة'}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.title + '...'}
              className="w-full text-base font-semibold px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.content + '...'}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* AI Enhance quick trigger */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleRunAiEnhance}
              disabled={isAiSummarizing || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiSummarizing ? 'جارٍ التحليل...' : 'تحليل ذكي وتوليد الوسوم'}</span>
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.category}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    categoryId === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{language === 'ar' ? cat.nameAr : cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              الوسوم (اضغط Enter للإضافة)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {tags.map((tg) => (
                <span
                  key={tg}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  #{tg}
                  <button
                    type="button"
                    onClick={() => removeTag(tg)}
                    className="hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="اكتب وسماً ثم اضغط Enter..."
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Color card theme */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              لون بطاقة الملاحظة
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    color === c ? 'scale-125 border-indigo-600 shadow-sm' : 'border-slate-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            {note ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
