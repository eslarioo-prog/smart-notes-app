/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Mic, Pin, Play, Pause, Bell, Calendar, Sparkles, Tag, Volume2, Edit2, Trash2, Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { NoteEntity } from '../types';
import { roomDb, DEFAULT_CATEGORIES } from '../db/roomDatabase';
import { useApp } from '../context/AppContext';
import { audioService } from '../services/audioService';
import { EditNoteModal } from './EditNoteModal';

export const NotesView: React.FC = () => {
  const { dbRevision, refreshDb, openRecorder, openNewReminder, language, t } = useApp();
  const [notes, setNotes] = useState<NoteEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingNote, setEditingNote] = useState<NoteEntity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [biometricTargetNote, setBiometricTargetNote] = useState<NoteEntity | null>(null);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Load notes on revision change
  useEffect(() => {
    let isMounted = true;
    roomDb.noteDao.getAll().then((list) => {
      if (isMounted) setNotes(list);
    });
    return () => {
      isMounted = false;
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [dbRevision]);

  // Audio playback handler
  const handleTogglePlay = async (note: NoteEntity) => {
    if (playingNoteId === note.id) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setPlayingNoteId(null);
      return;
    }

    // Stop current audio if playing
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    let audioSrc = note.audioUrl;
    if (!audioSrc && note.audioBlobKey) {
      const blob = await roomDb.getAudioBlob(note.audioBlobKey);
      if (blob) {
        audioSrc = URL.createObjectURL(blob);
      }
    }

    if (audioSrc) {
      const audio = new Audio(audioSrc);
      audioElementRef.current = audio;
      audio.playbackRate = playbackSpeed;
      audio.onended = () => setPlayingNoteId(null);
      audio.onerror = () => setPlayingNoteId(null);
      audio.play().then(() => setPlayingNoteId(note.id)).catch(console.warn);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, note: NoteEntity) => {
    e.stopPropagation();
    note.isPinned = !note.isPinned;
    await roomDb.noteDao.update(note);
    refreshDb();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await roomDb.noteDao.delete(id);
    refreshDb();
  };

  const handleOpenEdit = (note: NoteEntity) => {
    if (note.isLocked) {
      setBiometricTargetNote(note);
      setIsBiometricModalOpen(true);
    } else {
      setEditingNote(note);
      setIsEditModalOpen(true);
    }
  };

  const handleBiometricUnlockSuccess = () => {
    if (biometricTargetNote) {
      const target = biometricTargetNote;
      setIsBiometricModalOpen(false);
      setBiometricTargetNote(null);
      setEditingNote(target);
      setIsEditModalOpen(true);
    }
  };

  const handleCreateNew = () => {
    setEditingNote(null);
    setIsEditModalOpen(true);
  };

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesCategory = selectedCategory === 'all' || n.categoryId === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;
    const matchesSearch =
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      (n.transcription && n.transcription.toLowerCase().includes(query)) ||
      n.tags.some((t) => t.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6">
      {/* Top Action & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 start-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCreateNew}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-105 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.newNote}</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 && (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Mic className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.noNotesFound}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ابدأ بتسجيل أول مذكرة صوتية الآن أو اكتب ملاحظة جديدة، وسيتم حفظها محلياً في Room Database.
            </p>
          </div>
          <button
            onClick={openRecorder}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <Mic className="w-4 h-4" />
            <span>تسجيل صوتي فوري</span>
          </button>
        </div>
      )}

      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Pin className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.pinnedNotes}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => renderNoteCard(note))}
          </div>
        </div>
      )}

      {/* Recent Notes Section */}
      {otherNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>{t.recentNotes}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherNotes.map((note) => renderNoteCard(note))}
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      <EditNoteModal
        isOpen={isEditModalOpen}
        note={editingNote}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingNote(null);
        }}
      />

      {/* Floating Action Buttons Stack: Placed at bottom-end with New Note on top and Mic Recording directly below it */}
      <div className="hidden md:flex fixed bottom-8 end-8 z-30 flex-col items-center gap-3">
        {/* Upper FAB: New Text Note */}
        <button
          onClick={handleCreateNew}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1C273E] border border-slate-200 dark:border-[#283654] hover:border-amber-400 text-slate-800 dark:text-amber-300 hover:text-amber-500 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
          title="ملاحظة جديدة"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Lower FAB: Voice Recording Action placed directly below New Note */}
        <button
          onClick={openRecorder}
          className="relative w-15 h-15 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-amber-400/40"
          title="تسجيل صوتي فوري"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-25"></span>
          <Mic className="w-7 h-7 text-slate-950 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );

  function renderNoteCard(note: NoteEntity) {
    const cat = DEFAULT_CATEGORIES.find((c) => c.id === note.categoryId);
    const hasAudio = !!note.audioDuration || !!note.audioUrl || !!note.audioBlobKey;
    const isPlaying = playingNoteId === note.id;

    return (
      <div
        key={note.id}
        onClick={() => handleOpenEdit(note)}
        className="group relative bg-white dark:bg-[#151F32] rounded-2xl p-5 border border-slate-200 dark:border-[#283654] hover:border-amber-400/60 dark:hover:border-amber-400/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer space-y-4"
      >
        <div className="space-y-3">
          {/* Card Header & Unboxed Metadata (§1.A) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium" style={{ color: cat?.color }}>
                {cat ? (language === 'ar' ? cat.nameAr : cat.name) : 'عام'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {new Date(note.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => handleTogglePin(e, note)}
                className={`p-1.5 rounded-lg transition-colors ${
                  note.isPinned
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="تثبيت"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => handleDelete(e, note.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title & Preview */}
          <div className="space-y-1.5">
            <h4 className="text-base font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
              {note.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
              {note.content}
            </p>
          </div>

          {/* Voice Player Banner if Voice Note */}
          {hasAudio && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePlay(note)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shadow-sm ${
                    isPlaying ? 'bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ms-0.5" />}
                </button>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                  {audioService.formatDuration(note.audioDuration || 0)}
                </div>
              </div>

              {/* Speed toggle */}
              <div className="flex items-center gap-1 text-[10px]">
                {[1, 1.5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeedChange(s)}
                    className={`px-1.5 py-0.5 rounded ${
                      playbackSpeed === s && isPlaying
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary Highlight */}
          {note.aiSummary && (
            <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{note.aiSummary}</span>
            </div>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1">
              {note.tags.slice(0, 3).map((tg, i) => (
                <span
                  key={i}
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-medium"
                >
                  #{tg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer: Quick schedule action */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs"
        >
          <button
            type="button"
            onClick={() => openNewReminder(note.id, note.title)}
            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-[11px]"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>جدولة تنبيه في WorkManager</span>
          </button>

          <span className="text-[10px] text-slate-400">
            {new Date(note.updatedAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    );
  }
};
