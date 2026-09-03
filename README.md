# 🧠 MindForge — Production-Grade AI Study Workspace

> Transform study notes and technical interview topics into structured, high-yield active recall sessions with 3D flashcards, adaptive scenario quizzes, and mistake-based revision drills.

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://mindforge-ai-study-workspace.vercel.app/)
[![Render Deployment](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://mindforge-ai-study-workspace.onrender.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Gemini API](https://img.shields.io/badge/AI-Gemini%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev)

---

## 🌟 Production Features

### 1. Modern SaaS Interface
- **Desktop Sidebar Navigation**: Persistent left sidebar with instant quick-launch, study streak, and live status indicator.
- **Mobile Ergonomics**: Clean mobile topbar with slide-over drawer and thumb-reachable bottom navigation bar (tested from 360px up to 4K displays).
- **Dark & Light Mode**: Instant, flicker-free theme switcher with local storage persistence and system preference detection (`prefers-color-scheme`).

### 2. Dedicated Study Modes
- **🎯 Interview Prep**: Tailors the AI generation prompt to software engineering interview scenarios, technical tradeoffs, time/space complexity, common candidate pitfalls, and edge cases.
- **📝 Exam Mastery**: Focuses on academic rigor, definitions, theorems, formulas, and tricky boundary conditions.
- **⚡ Quick Revision**: High-yield rapid recall, concise prompt-answer pairs, and fast knowledge verification.
- **✦ Full Session**: Balanced comprehensive study pack.

### 3. Interactive Active Recall
- **🃏 3D Flip Flashcards**: Realistic 3D card flip with smooth CSS perspective, self-grading buttons ("I knew this" vs "Need review"), shuffle, restart, and full keyboard navigation (arrows, space, K, R).
- **📝 Scenario-Based Quiz**: One-question-at-a-time flow with option hotkeys (A, B, C, D), instant feedback with rationale and mnemonic memory cues.
- **🎉 Score Celebration**: Celebratory canvas confetti particle burst on high scores (≥80%) and detailed performance breakdown.
- **🔁 Mistake-Based Retest Drill**: Isolate and retest only the questions answered incorrectly until mastered.

### 4. Study Dashboard & History
- **📊 Retention Analytics**: Real-time tracking of total study sessions, cards reviewed, quiz attempts, and overall quiz accuracy percentage.
- **🔥 Consecutive Day Streak**: Calendar-based streak tracking rewarding daily revision.
- **⏱️ Study History**: Searchable and filterable recent sessions drawer with 1-click resumption, deletion, and clear history.
- **🔖 Saved Bookmarks**: Save individual cards, challenging quiz questions, or entire study sessions for quick practice.

### 5. Multi-Format Export
- **Markdown Document**: Formatted text ready to copy-paste into Obsidian, Notion, or GitHub Notes.
- **JSON File Download**: Structured export containing the validated session data schema.
- **Printable Study Sheet**: Clean `@media print` stylesheet removing all browser chrome for PDF generation or physical printing.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       React + Vite UI                       │
│  Sidebar / Dashboard / 3D Flashcards / Quiz / Retest Modal  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ POST /api/study-session
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Gateway                      │
│   • CORS protection (FRONTEND_URL configurable)             │
│   • In-memory Rate Limiting (20 req / 10 min per IP)        │
│   • In-memory LRU Cache (CACHE_TTL_SECONDS configurable)    │
│   • Client disconnect abort handling (req.on('close'))      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI Service Abstraction                      │
│   • Primary Provider: Google Gemini API                     │
│   • Fallback Provider: OpenAI-compatible (Groq/OpenRouter)  │
│   • Exponential Backoff: Up to 2 retries on 429/5xx         │
│   • Timeout: 45s AbortController circuit breaker            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Runtime Schema Validation                  │
│   • Strict sanitization of flashcards (6) and quiz (5)      │
│   • Enforces exactly 4 options and valid answer index (0-3) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Resilience & Error Handling

- **Circuit Breaking**: Requests automatically abort after 45 seconds to prevent hung backend processes.
- **Exponential Backoff**: Up to 2 retries on transient errors (HTTP 429 rate limit, 500, 502, 503, 504, or network drops).
- **Secondary AI Fallback**: If the primary Gemini provider quota is exhausted and `FALLBACK_AI_API_KEY` is configured, requests seamlessly route to a secondary provider (e.g. Groq / Llama 3.3).
- **Request Cancellation**: Starting a new session automatically cancels any in-flight requests, preventing stale responses from overwriting the UI.
- **Safe Health Check**: `GET /api/health` reports status, active model, and cache size without exposing keys or credentials.
- **Demo Fault Mode**: For rubric evaluation, setting `DEMO_FAULT_MODE=malformed-json` tests graceful frontend recovery.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
# Primary AI Provider
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# Optional Fallback Provider (Groq / OpenRouter)
FALLBACK_AI_API_KEY=
FALLBACK_AI_MODEL=llama-3.3-70b-versatile
FALLBACK_AI_BASE_URL=https://api.groq.com/openai/v1

# Server & Cache Configuration
PORT=3001
FRONTEND_URL=https://mindforge-ai-study-workspace.vercel.app
VITE_API_URL=http://localhost:3001
CACHE_TTL_SECONDS=3600
```

### 3. Development Mode
Run both frontend and backend concurrently:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Production Build
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` / `Enter` | Flip active flashcard |
| `←` / `→` | Navigate previous / next card or quiz question |
| `K` | Self-grade: "I knew this!" (mark mastered) |
| `R` | Self-grade: "Need review" (mark for revision) |
| `A`, `B`, `C`, `D` | Select quiz answer options |

---

## 📦 Project Structure

```text
mindforge/
├── server/
│   ├── middleware/
│   │   └── rateLimiter.js    # In-memory IP rate limiting
│   ├── services/
│   │   ├── ai.js             # Multi-provider abstraction & retry logic
│   │   └── cache.js          # In-memory LRU cache with TTL
│   ├── index.js              # Express server & API endpoints
│   └── schema.js             # Runtime JSON schema validation
├── src/
│   ├── components/
│   │   ├── Composer.jsx       # Topic input & mode selection
│   │   ├── Dashboard.jsx      # Analytics, streak, recent activity
│   │   ├── ExportModal.jsx    # Markdown, JSON, Print export
│   │   ├── FavoritesDrawer.jsx# Bookmarked cards, questions, sessions
│   │   ├── FlashcardsView.jsx # 3D flip card active recall
│   │   ├── Header.jsx         # Mobile topbar & bottom nav
│   │   ├── HistoryDrawer.jsx  # Searchable study history
│   │   ├── Icons.jsx          # SVG icon library
│   │   ├── QuizView.jsx       # Scenario quiz & score screen
│   │   ├── RetestModal.jsx    # Targeted mistake-based drills
│   │   └── Sidebar.jsx        # Desktop SaaS sidebar navigation
│   ├── utils/
│   │   ├── confetti.js        # Zero-dependency canvas celebration
│   │   └── storage.js         # Versioned, error-safe localStorage
│   ├── App.jsx                # Root orchestrator & state manager
│   ├── main.jsx               # React DOM entry point
│   └── styles.css             # Production SaaS design system
├── .env.example
├── .gitignore
├── package.json
└── vite.config.js
```

---

## 🔒 Security

- **Server-Side API Keys**: Upstream AI keys remain strictly server-side and are never bundled into client assets.
- **Git Safety**: `.env` is excluded via `.gitignore`. Only `.env.example` with placeholder credentials is committed.
- **Input Sanitization**: Request bodies are limited to 32KB and validated for topic length (1–3000 characters).
- **CORS Restrictions**: Configurable via `FRONTEND_URL` to restrict cross-origin access in production.

---

## 📌 Project Status

Engineered as a production-quality SDE internship project demonstrating:
**React 19 Architecture ➔ Node.js API Gateway ➔ Multi-Provider AI Resilience ➔ Runtime Schema Validation ➔ Interactive SaaS UX**