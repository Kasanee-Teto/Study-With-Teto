# Study with Teto — AI Study + Chess Companion (Free API Friendly)

**Current date:** 2026-03-30  
**Deadline:** 2026-04-13 23:59 WIB

Study with Teto is a web-based AI tool/service that helps students and the community learn faster, stay focused, and improve thinking skills through:
- Chat with “Teto” (a consistent persona assistant)
- Play chess vs Teto (practice + coaching)
- Study utilities (planner, pomodoro, flashcards, reports)

The project is designed to be **functional**, have **real-world impact** (study help + cognitive training), and have **monetization potential** (freemium + packs + donations).

---

## Project Goals
1. Build a working AI web service (not just a demo).
2. Provide at least **20 usable features**.
3. Be deployable and presentable before the deadline.
4. Be “free-API friendly”: supports low-cost/free AI usage and/or BYO-key mode.

---

## Feature List (24 Features)

### A) Core AI Chat
1. Realtime chat UI (streaming responses)
2. Persona engine: “Teto mode” system rules + style consistency
3. Multi-language support (at least ID + EN)
4. Per-user chat memory (summarization to keep it lightweight)
5. Prompt templates (study, summary, planning, interview practice)
6. File drop summarization (start with .txt/.md; PDF optional)
7. Citations-lite for uploaded docs (show referenced snippets)
8. Safety & moderation (basic filter + report button)

### B) Chess vs Teto
9. Chess board UI (drag & drop)
10. Chess engine integration (Stockfish WASM or server)
11. Chess coaching: explain moves + suggest improvements
12. Puzzle mode (tactics training)
13. Post-game analysis (blunders/mistakes + training advice)
14. Save and export games as PGN

### C) Social / Community
15. User accounts (GitHub OAuth or email magic link)
16. Public profile (stats, badges, streak)
17. Shareable links (share game analysis / selected chats)
18. Leaderboard (puzzle streak / training rating)
19. Feedback box + feature voting

### D) Productivity / Learning Tools
20. Task planner: goals -> checklist + suggested schedule
21. Pomodoro focus timer + reflection prompts
22. Flashcard generator from chats/docs (basic spaced repetition)
23. Weekly report (study topics + chess progress)
24. PWA offline-friendly (installable, caching core pages)

---

## Timeline (2026-03-30 to 2026-04-13)

### Sprint 0 — Setup & Foundation (Mar 30)
- Setup project, CI, env handling
- (15) Accounts (minimal) — Mar 30–Mar 31

### Sprint 1 — Chat MVP (Mar 31–Apr 3)
- (1) Streaming chat — Mar 31–Apr 1
- (2) Persona engine — Apr 1
- (3) Multi-language (ID/EN) — Apr 1–Apr 2
- (4) Memory summarization — Apr 2
- (5) Prompt templates — Apr 2
- (8) Safety + report — Apr 3

### Sprint 2 — Chess MVP (Apr 4–Apr 7)
- (9) Chess UI — Apr 4
- (10) Stockfish integration — Apr 4–Apr 5
- (14) PGN save/export — Apr 5
- (11) Coaching explanations — Apr 6
- (13) Post-game analysis — Apr 7

### Sprint 3 — Study Tools (Apr 8–Apr 10)
- (6) File drop summarize — Apr 8
- (7) Citations-lite — Apr 8–Apr 9
- (22) Flashcards — Apr 9
- (20) Task planner — Apr 10
- (21) Pomodoro — Apr 10

### Sprint 4 — Community + Polish + Deploy (Apr 11–Apr 13)
- (16) Public profile — Apr 11
- (17) Shareable links — Apr 11–Apr 12
- (18) Leaderboard — Apr 12
- (12) Puzzle mode — Apr 12
- (19) Feedback/voting — Apr 12
- (23) Weekly report — Apr 13
- (24) PWA — Apr 13
- QA + README + final demo + deploy — Apr 13

---

## Suggested Tech Stack (fast for deadline)
- Frontend/Backend: Next.js (TypeScript)
- UI: Tailwind CSS
- Auth: NextAuth (GitHub)
- DB: Prisma + SQLite (or Postgres/Supabase)
- Chess: chess.js + react-chessboard + Stockfish (WASM)
- Deploy: Vercel

---

## Monetization Ideas (optional)
- Freemium: basic chat/chess free, advanced analysis/packs paid
- Persona packs / study templates packs
- Donations (Ko-fi / GitHub Sponsors)
- Team plan for study groups (shared tasks/flashcards)

---

## Contributing
This is a student project. One representative member can submit on behalf of the team.
