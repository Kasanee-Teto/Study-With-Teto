# Study with Teto 🎀

A full-stack AI study assistant and chatbot featuring the persona of Kasane Teto. The application combines a React (Vite) frontend with Vercel serverless functions, integrating multiple LLM providers, Text-to-Speech (TTS), Speech-to-Text (ASR), voice cloning, machine translation, and Supabase for authentication and database management.

---

## 🛠 Tech Stack
- **Frontend:** React 19, Vite 8, React Router 7, TailwindCSS 4
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database & Auth:** Supabase (PostgreSQL, Auth, Row Level Security)
- **AI Providers:** OpenRouter, Groq (fallback)
- **Audio/TTS/ASR/Voice Cloning:** Fish Audio API, Browser Native `SpeechSynthesis`
- **Machine Translation:** LibreTranslate (self-hosted or hosted instance)

---

## 📋 Feature Audit List

### *Core features*
1. **User Authentication & OAuth:** Email/password signup/login with client-side password matching, plus OAuth integration (Google, GitHub, LinkedIn, X) via Supabase.
2. **AI Chatbot Interface:** Interactive chat UI featuring optimistic updates (showing temporary user messages instantly) and automatic scroll-to-bottom behavior.
3. **Multi-Provider AI Routing:** Serverless AI generation using OpenRouter as the primary provider with an automatic HTTP status-aware fallback to Groq on failure.
4. **Dynamic Persona Engine:** Context-aware system prompt generation for Kasane Teto, with a dedicated Study Tutor mode.
5. **Language Detection Algorithm:** Custom keyword scoring system (`detectLang`) to automatically detect if the user is speaking Indonesian or English and adjust the AI's persona reply language accordingly.
6. **Premium Text-to-Speech (TTS) Proxy:** Backend audio generation API securely proxying requests to the Fish Audio API.
7. **Browser Native TTS Fallback:** A regex-based female voice picker (`pickFemaleVoice`) that falls back to the browser's native `SpeechSynthesis` if the premium API fails or drops.
8. **Speech Translator (ID → EN):** A full voice pipeline that records microphone audio, transcribes it via Fish Audio ASR, translates it via LibreTranslate, synthesizes the English result via Fish Audio TTS, and plays it back with a downloadable MP3.
9. **Voice Cloning Studio:** Record or upload up to 3 voice samples with transcripts to clone a custom Fish Audio TTS voice, preview it with custom text, and manage/delete saved voice models.
10. **Dashboard Task Management:** A local state Todo list with add, toggle, delete, and "Enter" key quick-add functionalities.

### *Utility features*
11. **Audio LRU Cache Management:** Memory-efficient audio caching system (`MAX_CACHE = 8`) that limits stored TTS blobs in the browser to prevent memory leaks, automatically revoking old URLs.
12. **Granular Audio Playback Controls:** Play/retry and pause/resume controls mapped to individual chat bubbles, handling HTML5 Audio and native Speech Synthesis separately.
13. **Browser-Side WAV Conversion:** Recorded microphone audio (e.g. `webm`/`opus`) is automatically re-encoded to WAV via the Web Audio API client-side when the recorded format isn't accepted by Fish Audio ASR.
14. **Chat Session Search & Filtering:** Client-side search bar in the left sidebar to quickly filter historical chat sessions by title.
15. **Dynamic Chat Retitling:** Automatically generates and updates a chat session's title via a dedicated PATCH endpoint, based on the text of the user's first message.
16. **User Feedback System:** In-app modal that captures the user's current page context and saves feedback/bug reports directly to the Supabase database.
17. **Appearance Settings Engine:** Live-updating theme engine (Light/Dark/System), adjustable background blur, and overlay opacity persisting across reloads via `localStorage`.
18. **Privacy & Data Settings:** An analytics opt-out toggle, a "export my data" action that downloads a JSON file of local settings, and an account-deletion confirmation flow. Note: deletion currently clears local browser storage and redirects to login — it does not yet call a backend account-deletion endpoint.
19. **Internationalization (UI strings):** English/Indonesian UI translation with a persisted language preference and a `LanguageSwitcher` component. This is separate from the AI persona's own language auto-detection (`detectLang`), which controls what language Teto replies in, not the UI chrome.
20. **Live Dashboard Clock:** Real-time date and localized time display updating dynamically every second using `setInterval`.
21. **Local Notifications Toggle:** State management for a "Teto misses you" notification preference via `localStorage`.

### *Infra/support features*
22. **Protected Routing & Auth State:** React Router wrapper (`RequireAuth`) that securely blocks unauthenticated access using Supabase session listeners (`onAuthStateChange`).
23. **Backend Database Syncing:** Automatic `app_users` profile upserting securely handled via Supabase Admin service role, extracting GitHub/OAuth metadata into the app's database.
24. **RLS-Safe API Operations:** Backend validation ensuring users can only read, patch, and insert their own `chat_sessions` and `chat_messages` by strictly matching the authenticated Supabase user ID.
25. **Context Window Limiting:** The API automatically slices the conversation history to the last 40 messages (`CONTEXT_LIMIT`) before sending it to the LLM to save tokens and prevent context overflow.
26. **Mobile-Responsive Overlays:** Click-outside-to-close behavior (`onMouseDown`) and touch-friendly overlay drawers for mobile left/right sidebars.
27. **Global Error Boundary:** A React class component (`ErrorBoundary`) to gracefully catch unhandled rendering errors and provide a UI recovery/reload button instead of a white screen.

### *Feature Counts*
- **Frontend count:** 18
- **Backend count:** 9
- **Deduplicated total:** 27 implemented features

---

## 🚀 How to Start and Run the Repo

This project is built using **React + Vite** for the frontend and **Vercel Serverless Functions** (located in the `/api` directory) for the backend.

### Prerequisites
- Node.js v20.19+ or v22.12+ (required by Vite 8 and `@supabase/supabase-js`; Node 18 is **not** sufficient despite some transitive packages claiming to support it)
- Vercel CLI installed globally (`npm i -g vercel`)
- A Supabase Project (for Auth and PostgreSQL tables: `app_users`, `chat_sessions`, `chat_messages`, `feedback`)
- API Keys for OpenRouter and Fish Audio (required); Groq (optional, used only as an automatic fallback if OpenRouter fails)
- A LibreTranslate endpoint (self-hosted or hosted) for the Speech Translator feature

### 1. Environment Variables
Create a `.env` (or `.env.local`) file in the root of your project and populate it with the following keys (see `.env.example` for a ready-to-copy template):

```env
# Frontend (Vite)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Base URL of the API server (leave empty when using `vercel dev`, which serves
# both the frontend and the /api/* functions on the same origin at port 3000).
# Set this only if the API runs on a different port/host during development.
VITE_API_BASE_URL=

# Backend (Vercel Serverless)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=your_preferred_openrouter_model

# Optional — only needed if you want the automatic Groq fallback in api/ai.js
# to work when every OpenRouter model attempt fails. Safe to leave unset;
# the app still works with OpenRouter alone.
GROQ_API_KEY=your_groq_api_key
GROQ_DEFAULT_MODEL=your_preferred_groq_model

FISH_API_KEY=your_fish_audio_api_key

# LibreTranslate (used by the Speech Translator feature)
# There is no public default — you must point this at a running LibreTranslate instance.
# Options:
#   1. A public/hosted LibreTranslate endpoint (often requires an API key and may rate-limit you), or
#   2. A self-hosted instance (recommended for production) — see below.
LIBRETRANSLATE_URL=http://localhost:5000
# Optional — typically only needed for hosted/public instances that enforce an API key.
# Not required when self-hosting with default settings.
LIBRETRANSLATE_API_KEY=
```

> **Note:** `api/chat/sessions/[id].js` (the session-retitle endpoint) authenticates as the signed-in user rather than the service role, so it reads the Supabase anon key from `SUPABASE_ANON_KEY` if set, falling back to `VITE_SUPABASE_ANON_KEY`. You don't need to duplicate the value — setting `VITE_SUPABASE_ANON_KEY` above is enough — but you can set `SUPABASE_ANON_KEY` explicitly if you prefer to keep client- and server-side vars separate.

LibreTranslate publishes an official Docker image, so the quickest way to self-host it locally is:

```bash
docker run -p 5000:5000 libretranslate/libretranslate
```

After that, set `LIBRETRANSLATE_URL` to wherever the instance is reachable (`http://localhost:5000` for local dev, or the internal/public URL of your deployed instance). See LibreTranslate's own documentation for production self-hosting options.

### 2. Database Setup (Supabase)
Run the following in the Supabase SQL editor to create the required tables before starting the app:

```sql
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  github_login text unique,
  email text unique,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS supabase_user_id uuid;

-- Step 2: Add unique constraint on supabase_user_id
--         (used by upsert onConflict: 'supabase_user_id')
ALTER TABLE app_users
  ADD CONSTRAINT app_users_supabase_user_id_key UNIQUE (supabase_user_id);
  
-- Step 3: (Optional) After all existing users have signed in and been upserted,
--         enforce NOT NULL to prevent new rows without supabase_user_id:

ALTER TABLE app_users
  ALTER COLUMN supabase_user_id SET NOT NULL;

-- Step 4: (Recommended) Row Level Security — restrict each table to its owner.
--         Enable RLS first if not already enabled:
--
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies (adjust service-role bypass as needed):

CREATE POLICY "Users can manage own app_users row"
  ON app_users FOR ALL
  USING (supabase_user_id = auth.uid())
  WITH CHECK (supabase_user_id = auth.uid());

CREATE POLICY "Users can manage own chat sessions"
  ON chat_sessions FOR ALL
  USING (user_id IN (SELECT id FROM app_users WHERE supabase_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM app_users WHERE supabase_user_id = auth.uid()));

CREATE POLICY "Users can manage own chat messages"
  ON chat_messages FOR ALL
  USING (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN app_users au ON au.id = cs.user_id
    WHERE au.supabase_user_id = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN app_users au ON au.id = cs.user_id
    WHERE au.supabase_user_id = auth.uid()
  ));
--

```

```sql
-- =========================
-- Session title PATCH support + scalability indexes
-- =========================

-- chat_sessions needs updated_at for recency ordering and patch updates
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- backfill old rows
UPDATE public.chat_sessions
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

-- keep updated_at fresh on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- indexes for scale
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated_at
  ON public.chat_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at
  ON public.chat_messages (session_id, created_at ASC);

-- make policy creation idempotent (safe if re-run)
DROP POLICY IF EXISTS "Users can manage own app_users row" ON public.app_users;
DROP POLICY IF EXISTS "Users can manage own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can manage own chat messages" ON public.chat_messages;

CREATE POLICY "Users can manage own app_users row"
  ON public.app_users FOR ALL
  USING (supabase_user_id = auth.uid())
  WITH CHECK (supabase_user_id = auth.uid());

CREATE POLICY "Users can manage own chat sessions"
  ON public.chat_sessions FOR ALL
  USING (user_id IN (SELECT id FROM public.app_users WHERE supabase_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.app_users WHERE supabase_user_id = auth.uid()));

CREATE POLICY "Users can manage own chat messages"
  ON public.chat_messages FOR ALL
  USING (session_id IN (
    SELECT cs.id
    FROM public.chat_sessions cs
    JOIN public.app_users au ON au.id = cs.user_id
    WHERE au.supabase_user_id = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT cs.id
    FROM public.chat_sessions cs
    JOIN public.app_users au ON au.id = cs.user_id
    WHERE au.supabase_user_id = auth.uid()
  ));
```

You'll also need a `feedback` table for the in-app feedback modal (referenced by `src/pages/Dashboard.jsx`), with at minimum `user_id`, `username`, `email`, `message`, and `page` columns:

```sql
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  username text,
  email text,
  message text not null,
  page text,
  created_at timestamptz default now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Dashboard.jsx inserts feedback as the signed-in user via the anon client,
-- so an insert-only policy tied to the authenticated session is sufficient.
CREATE POLICY "Users can submit their own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### 3. Install Dependencies
Run the following command to install all required NPM packages:
```bash
npm install
```

### 4. Run Locally for Development
Because the app relies on Vercel Serverless Functions for its `/api/*` routes, running `vite` alone will not start the backend. **You must use the Vercel CLI to emulate the cloud environment:**

```bash
vercel dev
```

This command will:
1. Start the Vite development server for the frontend.
2. Spin up a local Node.js environment to handle requests to `/api/*`.
3. Provide you with a single `localhost` URL (usually `http://localhost:3000`) where both the frontend and backend are seamlessly mapped and proxy correctly.

### 5. Deployment
To deploy to production, simply push your code to GitHub and connect your repository to Vercel, or deploy directly via the Vercel CLI:
```bash
vercel --prod
```
*(Make sure to add all the environment variables in your Vercel project settings dashboard before deploying — including `LIBRETRANSLATE_URL` if the Speech Translator feature is in use).*