import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const app = express();
const PORT = process.env.LOCAL_API_PORT || 3001;
const MOCK_API = process.env.LOCAL_MOCK_API === 'true';

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('[local-api]', error);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Local API server error',
          detail: error?.message || String(error),
        });
      }
    }
  };
}

if (MOCK_API) {
  console.warn('[local-api] MOCK MODE enabled. No real API keys are required.');

  const mockSession = {
    id: 'mock-session-1',
    title: 'Mock chat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  app.all('/api/user/upsert', (req, res) => {
    res.json({
      appUser: {
        id: 'mock-app-user-1',
        email: 'dev@example.local',
        display_name: 'Dev User',
      },
    });
  });

  app.get('/api/chat/session', (req, res) => {
    res.json({ sessions: [mockSession] });
  });

  app.post('/api/chat/session', (req, res) => {
    res.json({
      session: {
        ...mockSession,
        id: `mock-session-${Date.now()}`,
        title: req.body?.title || 'New chat',
      },
    });
  });

  app.patch('/api/chat/sessions/:id', (req, res) => {
    res.json({
      id: req.params.id,
      title: req.body?.title || 'Mock chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  app.get('/api/chat/message', (req, res) => {
    res.json({
      messages: [
        {
          id: 'mock-message-1',
          session_id: 'mock-session-1',
          role: 'assistant',
          content: 'Hi! This is a mock Teto response. Local mode is working.',
          created_at: new Date().toISOString(),
        },
      ],
    });
  });

  app.post('/api/chat/message', (req, res) => {
    res.json({
      message: {
        id: `mock-message-${Date.now()}`,
        session_id: req.body?.sessionId || 'mock-session-1',
        role: req.body?.role || 'user',
        content: req.body?.content || '',
        created_at: new Date().toISOString(),
      },
    });
  });

  app.post('/api/ai', (req, res) => {
    const lastUserMessage = [...(req.body?.messages || [])]
      .reverse()
      .find((message) => message.role === 'user');

    res.json({
      text: `Mock AI reply: I received "${lastUserMessage?.content || 'your message'}".`,
      provider: 'mock',
      requestId: `mock-${Date.now()}`,
    });
  });

  app.post('/api/translate', (req, res) => {
    res.json({ translatedText: `[mock translation] ${req.body?.text || ''}` });
  });

  app.post('/api/asr', (req, res) => {
    res.json({
      text: 'This is a mock transcription.',
      duration: 1,
      segments: [],
    });
  });

  app.all('/api/tts', (req, res) => {
    res.status(503).json({ error: 'Mock mode: Fish TTS disabled.' });
  });

  app.all('/api/voice-clone', (req, res) => {
    res.json({ models: [], model: { id: 'mock-voice-model' } });
  });

  app.all('/api/voice-clone-preview', (req, res) => {
    res.status(503).json({ error: 'Mock mode: voice clone preview disabled.' });
  });
} else {
  console.log('[local-api] REAL MODE enabled. Using real env keys.');

  const ai = (await import('./api/ai.js')).default;
  const tts = (await import('./api/tts.js')).default;
  const asr = (await import('./api/asr.js')).default;
  const translate = (await import('./api/translate.js')).default;
  const voiceClone = (await import('./api/voice-clone.js')).default;
  const voiceClonePreview = (await import('./api/voice-clone-preview.js'))
    .default;
  const userUpsert = (await import('./api/user/upsert.js')).default;
  const chatSession = (await import('./api/chat/session.js')).default;
  const chatMessage = (await import('./api/chat/message.js')).default;
  const chatSessionById = (await import('./api/chat/sessions/[id].js')).default;

  app.all('/api/ai', wrap(ai));
  app.all('/api/tts', wrap(tts));
  app.all('/api/asr', wrap(asr));
  app.all('/api/translate', wrap(translate));
  app.all('/api/voice-clone', wrap(voiceClone));
  app.all('/api/voice-clone-preview', wrap(voiceClonePreview));

  app.all('/api/user/upsert', wrap(userUpsert));
  app.all('/api/chat/session', wrap(chatSession));
  app.all('/api/chat/message', wrap(chatMessage));

  app.all('/api/chat/sessions/:id', (req, res) => {
    Object.defineProperty(req, 'query', {
      value: { ...req.query, id: req.params.id },
      configurable: true,
    });

    return wrap(chatSessionById)(req, res);
  });
}

app.listen(PORT, () => {
  console.log(`[local-api] running at http://localhost:${PORT}`);
});
