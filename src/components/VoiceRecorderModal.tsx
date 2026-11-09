/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Sparkles, X, Check, RefreshCw, Volume2, Calendar, CheckSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { audioService, AudioRecordingResult } from '../services/audioService';
import { analyzeVoiceNote } from '../services/aiService';
import { roomDb, DEFAULT_CATEGORIES } from '../db/roomDatabase';
import { NoteEntity } from '../types';

export const VoiceRecorderModal: React.FC = () => {
  const { isRecorderOpen, closeRecorder, language, refreshDb, t } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedResult, setRecordedResult] = useState<AudioRecordingResult | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ideas');
  const [useAiAnalysis, setUseAiAnalysis] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(24).fill(10));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const stopDictationRef = useRef<(() => void) | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isRecorderOpen) {
      setRecordingDuration(0);
      setRecordedResult(null);
      setLiveTranscript('');
      setNoteTitle('');
      setNoteContent('');
      setAiSuggestions(null);
      setIsAnalyzing(false);
      setErrorMessage(null);
      // Auto-start recording after a slight moment for smooth UX
      const t = setTimeout(() => {
        handleStartRecording();
      }, 350);
      return () => clearTimeout(t);
    } else {
      handleCancel();
    }
  }, [isRecorderOpen]);

  // Audio waveform animation loop
  const updateWaveform = () => {
    if (!isRecording) return;
    const data = audioService.getWaveformData();
    // Sample 24 points
    const bars: number[] = [];
    const step = Math.max(1, Math.floor(data.length / 24));
    for (let i = 0; i < 24; i++) {
      const val = data[i * step] || 0;
      bars.push(Math.max(12, Math.min(80, Math.floor((val / 255) * 80))));
    }
    setWaveformBars(bars);
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  };

  const handleStartRecording = async () => {
    try {
      setErrorMessage(null);
      await audioService.startRecording(language);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Start live speech dictation
      stopDictationRef.current = audioService.startLiveDictation(
        language,
        (text) => {
          setLiveTranscript(text);
          setNoteContent(text);
        },
        (err) => console.warn('Dictation notice:', err)
      );

      // Start waveform RAF
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      setErrorMessage(language === 'ar' ? 'تعذر الوصول للميكروفون، يرجى منح الإذن للتسجيل.' : 'Microphone access denied or unavailable.');
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (stopDictationRef.current) {
      stopDictationRef.current();
      stopDictationRef.current = null;
    }

    try {
      const result = await audioService.stopRecording();
      setRecordedResult(result);

      const effectiveText = liveTranscript.trim() || (language === 'ar' ? `تسجيل صوتي (${audioService.formatDuration(result.duration)})` : `Voice Memo (${audioService.formatDuration(result.duration)})`);
      setNoteContent(effectiveText);

      // Auto-run AI analysis if enabled
      if (useAiAnalysis) {
        setIsAnalyzing(true);
        const analysis = await analyzeVoiceNote(effectiveText, language);
        setAiSuggestions(analysis);
        if (analysis.title) setNoteTitle(analysis.title);
        if (analysis.category) {
          const match = DEFAULT_CATEGORIES.find((c) => c.id === analysis.category);
          if (match) setSelectedCategory(match.id);
        }
        setIsAnalyzing(false);
      } else {
        setNoteTitle(language === 'ar' ? `تسجيل ${new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : `Memo ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      }
    } catch (err) {
      console.error('Stop recording error:', err);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      audioService.cancelRecording();
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (stopDictationRef.current) stopDictationRef.current();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsRecording(false);
    setRecordedResult(null);
    closeRecorder();
  };

  const toggleAudioPlayback = () => {
    if (!recordedResult?.url) return;
    if (!audioElementRef.current) {
      const audio = new Audio(recordedResult.url);
      audioElementRef.current = audio;
      audio.playbackRate = audioPlaybackRate;
      audio.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.playbackRate = audioPlaybackRate;
      audioElementRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.warn);
    }
  };

  const changePlaybackSpeed = (rate: number) => {
    setAudioPlaybackRate(rate);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = rate;
    }
  };

  const handleSaveToRoomDb = async () => {
    const finalTitle = noteTitle.trim() || (language === 'ar' ? 'مذكرة صوتية جديدة' : 'New Voice Memo');
    const finalContent = noteContent.trim() || liveTranscript.trim() || finalTitle;
    const now = Date.now();
    const noteId = `note_${now}`;

    // 1. Create Note entity
    const newNote: NoteEntity = {
      id: noteId,
      title: finalTitle,
      content: finalContent,
      categoryId: selectedCategory,
      tags: aiSuggestions?.tags || ['صوت', 'تسجيل'],
      color: '#e0e7ff',
      isPinned: false,
      isArchived: false,
      isDeleted: false,
      audioDuration: recordedResult?.duration || recordingDuration,
      transcription: liveTranscript || undefined,
      audioUrl: recordedResult?.url || undefined,
      createdAt: now,
      updatedAt: now,
      aiSummary: aiSuggestions?.summary || undefined,
    };

    // Save audio blob in Room DB if available
    if (recordedResult?.blob) {
      await roomDb.saveAudioBlob(noteId, recordedResult.blob);
      newNote.audioBlobKey = noteId;
    }

    await roomDb.noteDao.insert(newNote);

    // 2. If AI detected tasks, auto-insert them in Room TaskDao
    if (aiSuggestions?.tasks && Array.isArray(aiSuggestions.tasks)) {
      for (const t of aiSuggestions.tasks) {
        if (t.text) {
          await roomDb.taskDao.insert({
            id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            noteId,
            text: t.text,
            isDone: false,
            priority: 'medium',
            createdAt: Date.now(),
          });
        }
      }
    }

    // 3. If AI suggested a scheduled reminder, insert in Room ReminderDao
    if (aiSuggestions?.suggestedReminder?.hasReminder) {
      const dueTime = aiSuggestions.suggestedReminder.dueDateTime
        ? new Date(aiSuggestions.suggestedReminder.dueDateTime).getTime()
        : now + 2 * 3600 * 1000;

      await roomDb.reminderDao.insert({
        id: `rem_${Date.now()}`,
        noteId,
        title: aiSuggestions.suggestedReminder.title || finalTitle,
        description: aiSuggestions.summary || finalContent.slice(0, 80),
        scheduledTime: isNaN(dueTime) ? now + 2 * 3600 * 1000 : dueTime,
        isCompleted: false,
        priority: aiSuggestions.suggestedReminder.priority || 'high',
        repeatInterval: 'none',
        notifySound: 'chime',
        isNotified: false,
        createdAt: now,
      });
    }

    refreshDb();
    handleCancel();
  };

  if (!isRecorderOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t.recordVoice}
              </h2>
              <span className="text-xs text-slate-500">Android Material Mic & Audio Stream</span>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Waveform & Recording Canvas Display */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white text-center flex flex-col items-center justify-center space-y-4 shadow-inner min-h-[170px]">
            {/* Live Audio Visualizer Bars */}
            <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-sm px-4">
              {waveformBars.map((height, idx) => (
                <div
                  key={idx}
                  className={`w-2 rounded-full transition-all duration-75 ${
                    isRecording
                      ? 'bg-gradient-to-t from-indigo-500 to-rose-400'
                      : recordedResult
                      ? 'bg-indigo-400'
                      : 'bg-slate-700'
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            {/* Timer and Status */}
            <div className="flex items-center gap-3">
              {isRecording && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
              <span className="text-2xl font-mono font-bold tracking-wider tabular-nums">
                {audioService.formatDuration(isRecording ? recordingDuration : recordedResult?.duration || 0)}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {isRecording ? t.speakNow : recordedResult ? t.recordingInProgress : t.speakNow}
            </p>
          </div>

          {/* Recording Controls: Big Mic or Stop */}
          <div className="flex items-center justify-center gap-4">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-md shadow-rose-600/30 transition-all active:scale-95"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>{t.stopAndSave}</span>
              </button>
            ) : !recordedResult ? (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Mic className="w-5 h-5" />
                <span>بدء التسجيل الآن</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAudioPlayback}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm transition-all"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlayingAudio ? 'إيقاف مؤقت' : 'استماع للتسجيل'}</span>
                </button>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  {[1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackSpeed(rate)}
                      className={`px-2 py-1 rounded-lg transition-colors font-medium ${
                        audioPlaybackRate === rate
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleStartRecording}
                  title="إعادة التسجيل"
                  className="p-2.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Live Transcript / Note Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.title}
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="عنوان المذكرة..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.transcription} / {t.content}
                </label>
                {liveTranscript && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    تم التقاط الصوت لحظياً
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="النص المفرغ من التسجيل الصوتي أو اكتب تفاصيل إضافية..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.category}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {DEFAULT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      selectedCategory === cat.id
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

            {/* AI Assistant Extraction Spotlight */}
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    مساعد الذكاء الاصطناعي (Gemini Smart Companion)
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAiAnalysis}
                    onChange={(e) => setUseAiAnalysis(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>استخراج ذكي</span>
                </label>
              </div>

              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ تحليل نبرة الصوت وتلخيص المذكرة واستخراج التنبيهات المجدولة...</span>
                </div>
              ) : aiSuggestions ? (
                <div className="space-y-2 text-xs">
                  {aiSuggestions.summary && (
                    <div className="text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-indigo-900 dark:text-indigo-300">الملخص: </span>
                      {aiSuggestions.summary}
                    </div>
                  )}

                  {aiSuggestions.tasks?.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        المهام المكتشفة ({aiSuggestions.tasks.length}):
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300 pr-2">
                        {aiSuggestions.tasks.map((task: any, idx: number) => (
                          <li key={idx}>{task.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiSuggestions.suggestedReminder?.hasReminder && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4 shrink-0 text-emerald-600" />
                      <div>
                        <span className="font-semibold">اقتراح جدولة تنبيه في WorkManager: </span>
                        <span>{aiSuggestions.suggestedReminder.title}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  يقوم المساعد بتحويل الحديث الصوتي إلى عنوان وتلخيص ذكي واستخراج بنود المهام وتحديد مواعيد التنبيهات تلقائياً وحفظها في Room Database.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={handleSaveToRoomDb}
            disabled={isRecording}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            <span>حفظ في Room DB</span>
          </button>
        </div>
      </div>
    </div>
  );
};
