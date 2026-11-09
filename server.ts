import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser
app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// AI Voice Note Analysis & Smart Reminders Extraction
app.post('/api/ai/analyze-note', async (req, res) => {
  try {
    const { text, language = 'ar' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      // Provide intelligent rule-based fallback if API key is not yet set
      const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
      const title = lines[0] ? lines[0].slice(0, 45) : (language === 'ar' ? 'ملاحظة جديدة' : 'New Note');
      return res.json({
        title,
        summary: text.slice(0, 160),
        category: 'general',
        tasks: lines.slice(1, 6).map((l: string) => ({ text: l.trim().replace(/^[-*•\d.]+\s*/, ''), done: false })),
        suggestedReminder: null,
      });
    }

    const isArabic = language === 'ar';
    const nowIso = new Date().toISOString();

    const prompt = `You are an intelligent voice memo and task scheduler assistant (like an Android Room + WorkManager smart companion).
Current timestamp: ${nowIso}.
User memo language preference: ${language}.

Analyze the following voice memo/note content and extract structured data:
"""
${text}
"""

Return ONLY a valid JSON object matching this schema without markdown fences:
{
  "title": "A concise, meaningful title (max 5-7 words in ${isArabic ? 'Arabic' : 'the note language'})",
  "summary": "1-2 sentence executive summary in ${isArabic ? 'Arabic' : 'the note language'}",
  "category": "one of: work | personal | ideas | shopping | health | study | general",
  "tags": ["array", "of", "relevant", "short", "tags"],
  "tasks": [
    { "text": "Action item or task extracted from memo" }
  ],
  "suggestedReminder": {
    "hasReminder": true or false,
    "title": "Short reminder title",
    "dueDateTime": "ISO-8601 string or null if no specific time mentioned",
    "priority": "low" | "medium" | "high" | "urgent"
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        title: text.slice(0, 40),
        summary: text.slice(0, 120),
        category: 'general',
        tags: [],
        tasks: [],
        suggestedReminder: null,
      };
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error analyzing note with Gemini:', error);
    res.status(500).json({
      error: 'Failed to analyze note',
      message: error?.message || 'Internal server error',
    });
  }
});

// Transcribe audio using Gemini multimodal
app.post('/api/ai/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', language = 'ar' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please use browser speech-to-text.',
      });
    }

    // Strip data URL prefix if present
    const base64Data = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Transcribe this voice audio accurately into text. If spoken in Arabic, transcribe in clean Arabic. If spoken in English or mixed, preserve the spoken language. Then provide a concise title.
Format as JSON: { "transcript": "full transcribed text", "detectedLanguage": "ar" or "en", "suggestedTitle": "brief title" }`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error?.message || 'Server error',
    });
  }
});

// Dev server with Vite middleware or Production static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
