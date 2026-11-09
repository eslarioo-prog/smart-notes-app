/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Priority } from '../types';

export interface AnalyzedNoteResult {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  tasks: { text: string }[];
  suggestedReminder?: {
    hasReminder: boolean;
    title: string;
    dueDateTime: string | null;
    priority: Priority;
  } | null;
}

export async function analyzeVoiceNote(
  text: string,
  language: 'ar' | 'en' = 'ar'
): Promise<AnalyzedNoteResult> {
  try {
    const res = await fetch('/api/ai/analyze-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('AI note analysis fallback to local heuristics:', error);

    // Rule-based offline parser
    const clean = text.trim();
    const firstLine = clean.split('\n')[0] || (language === 'ar' ? 'مذكرة صوتية' : 'Voice Memo');
    const title = firstLine.length > 40 ? firstLine.slice(0, 38) + '...' : firstLine;
    const lines = clean.split('\n').filter((l) => l.trim().length > 0);
    const tasks = lines
      .slice(1)
      .filter((l) => l.startsWith('-') || l.startsWith('•') || /^\d+\./.test(l) || l.includes('يجب') || l.includes('need to') || l.includes('task'))
      .map((l) => ({ text: l.replace(/^[-*•\d.]+\s*/, '').trim() }));

    return {
      title,
      summary: clean.slice(0, 140),
      category: 'ideas',
      tags: [language === 'ar' ? 'مذكرة' : 'memo', 'صوت'],
      tasks: tasks.length > 0 ? tasks : [],
      suggestedReminder: null,
    };
  }
}

export async function transcribeAudioBlob(
  audioBase64: string,
  mimeType: string,
  language: 'ar' | 'en' = 'ar'
): Promise<{ transcript: string; suggestedTitle?: string } | null> {
  try {
    const res = await fetch('/api/ai/transcribe-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType, language }),
    });

    if (!res.ok) {
      throw new Error(`Transcription request failed: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (e) {
    console.warn('Audio transcription failed:', e);
    return null;
  }
}
