```markdown
# Study with Teto 🎀

A full-stack AI study assistant and chatbot featuring the persona of Kasane Teto. The application combines a React (Vite) frontend with Vercel serverless functions, integrating multiple LLM providers, Text-to-Speech (TTS), and Supabase for authentication and database management.

---

## 🛠 Tech Stack
- **Frontend:** React 18, Vite, React Router, TailwindCSS
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database & Auth:** Supabase (PostgreSQL, Auth, Row Level Security)
- **AI Providers:** OpenRouter, Groq (Fallback)
- **Audio/TTS:** Fish Audio API, Browser Native `SpeechSynthesis`

---

## 📋 Feature Audit List

### *Core features*
1. **User Authentication & OAuth:** Email/password signup/login with client-side password matching, plus OAuth integration (Google, GitHub, LinkedIn, X) via Supabase.
2. **AI Chatbot Interface:** Interactive chat UI featuring optimistic updates (showing temporary user messages instantly) and automatic scroll-to-bottom behavior.
3. **Multi-Provider AI Routing:** Serverless AI generation using OpenRouter as the primary provider with an automatic HTTP status-aware fallback to Groq on failure.
4. **Dynamic Persona Engine:** Context-aware system prompt generation with specific persona configurations for general chat, Study Tutor, and Chess Coach modes.
5. **Language Detection Algorithm:** Custom keyword scoring system (`detectLang`) to automatically detect if the user is speaking Indonesian or English and adjust the AI's prompt language accordingly.
6. **Premium Text-to-Speech (TTS) Proxy:** Backend audio generation API securely proxying requests to the Fish Audio API.
7. **Browser Native TTS Fallback:** A regex-based female voice picker (`pickFemaleVoice`) that falls back to the browser's native `SpeechSynthesis` if the premium API fails or drops.
8. **Dashboard Task Management:** A local state Todo list with add, toggle, delete, and "Enter" key quick-add functionalities.

### *Utility features*
9. **Audio LRU Cache Management:** Memory-efficient audio caching system (`MAX_CACHE = 8`) that limits stored TTS blobs in the browser to prevent memory leaks, automatically revoking old URLs.
10. **Granular Audio Playback Controls:** Play, retry, pause, and resume controls mapped to individual chat bubbles, handling HTML5 Audio and native Speech Synthesis separately.
11. **Chat Session Search & Filtering:** Client-side search bar in the left sidebar to quickly filter historical chat sessions by title.
12. **Dynamic Chat Retitling:** Automatically generates and updates a chat session's title in the database based on the text of the user's first message.
13. **User Feedback System:** In-app modal that captures the user's current page context and saves feedback/bug reports directly to the Supabase database.
14. **Appearance Settings Engine:** Live-updating theme engine (Light/Dark/System), adjustable background blur, and overlay opacity persisting across reloads via `localStorage`.
15. **Data Privacy & Export:** A utility to download a JSON blob of user settings/data, and an account deletion UI simulator that clears local storage.
16. **Live Dashboard Clock:** Real-time date and localized time display updating dynamically every second using `setInterval`.
17. **Local Notifications Toggle:** State management for a "Teto misses you" notification preference via `localStorage`.

### *Infra/support features*
18. **Protected Routing & Auth State:** React Router wrapper (`RequireAuth`) that securely blocks unauthenticated access using Supabase session listeners (`onAuthStateChange`).
19. **Backend Database Syncing:** Automatic `app_users` profile upserting securely handled via Supabase Admin service role, extracting GitHub/OAuth metadata into the app's database.
20. **RLS-Safe API Operations:** Backend validation ensuring users can only read, patch, and insert their own `chat_sessions` and `chat_messages` by strictly matching the authenticated Supabase user ID.
21. **Context Window Limiting:** The API automatically slices the conversation history to the last 40 messages (`CONTEXT_LIMIT`) before sending it to the LLM to save tokens and prevent context overflow.
22. **Mobile-Responsive Overlays:** Click-outside-to-close behavior (`onMouseDown`) and touch-friendly overlay drawers for mobile left/right sidebars.
23. **Global Error Boundary:** A React class component (`ErrorBoundary`) to gracefully catch unhandled rendering errors and provide a UI recovery/reload button instead of a white screen.

### *Feature Counts*
- **Frontend count:** 14
- **Backend count:** 9
- **Deduplicated total:** 23 implemented features

---

## 🚀 How to Start and Run the Repo

This project is built using **React + Vite** for the frontend and **Vercel Serverless Functions** (located in the `/api` directory) for the backend. 

### Prerequisites
- Node.js (v18+)
- Vercel CLI installed globally (`npm i -g vercel`)
- A Supabase Project (for Auth and PostgreSQL tables: `app_users`, `chat_sessions`, `chat_messages`, `feedback`)
- API Keys for OpenRouter, Groq, and Fish Audio

### 1. Environment Variables
Create a `.env` (or `.env.local`) file in the root of your project and populate it with the following keys:

```env
# Frontend (Vite)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend (Vercel Serverless)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=your_preferred_openrouter_model
GROQ_API_KEY=your_groq_api_key
GROQ_DEFAULT_MODEL=your_preferred_groq_model
FISH_API_KEY=your_fish_audio_api_key
```

### 2. Install Dependencies
Run the following command to install all required NPM packages:
```bash
npm install
```

### 3. Run Locally for Development
Because the app relies on Vercel Serverless Functions for its `/api/*` routes, running `vite` alone will not start the backend. **You must use the Vercel CLI to emulate the cloud environment:**

```bash
vercel dev
```

This command will:
1. Start the Vite development server for the frontend.
2. Spin up a local Node.js environment to handle requests to `/api/*`.
3. Provide you with a single `localhost` URL (usually `http://localhost:3000`) where both the frontend and backend are seamlessly mapped and proxy correctly.

### 4. Deployment
To deploy to production, simply push your code to GitHub and connect your repository to Vercel, or deploy directly via the Vercel CLI:
```bash
vercel --prod
```
*(Make sure to add all the environment variables in your Vercel project settings dashboard before deploying).*
```