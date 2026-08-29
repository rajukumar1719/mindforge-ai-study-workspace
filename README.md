# MindForge — Adaptive AI Study Workspace

A React + Node.js internship assignment project that turns free-form study notes into a structured, interactive learning session.

## What it demonstrates

- React functional components and hooks
- Free-form AI input
- Real LLM integration
- Structured JSON output
- Runtime validation before rendering
- Loading, empty, timeout and error states
- Retry flow
- Abort/cancellation of older requests
- Interactive flashcards
- Quiz scoring
- Wrong-answer tracking and retest mode
- Responsive UI
- Optional dark mode
- Git-friendly architecture

## Architecture

Browser (React)
→ `POST /api/study-session`
→ Node/Express backend
→ Gemini API with JSON schema
→ JSON parsing + runtime validation
→ React interactive components

The API key stays on the server and is never bundled into the browser.

## Setup

Requirements:
- Node.js 20+ recommended
- A Gemini API key

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

On Windows, simply copy `.env.example` to `.env`.

3. Add your key:

```env
GEMINI_API_KEY=your_key_here
```

4. Start both frontend and backend:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, normally:

`http://localhost:5173`

## Production-style build

```bash
npm run build
```

For the assignment's requested local start command, keep the backend API running and serve the built frontend using your preferred deployment/static hosting setup.

## Failure handling

The backend and frontend deliberately defend against unreliable AI output:

- missing API key
- provider HTTP errors
- timeout
- empty model output
- malformed JSON
- wrong JSON shape
- empty flashcards/quiz
- invalid quiz options/correct-answer index
- cancelled/stale frontend requests

### Demo malformed JSON

To demonstrate the assignment's bad-output requirement without intentionally breaking the app:

```env
DEMO_FAULT_MODE=malformed-json
```

Restart the server and click Generate. The UI should show a recoverable error instead of crashing. Set it back to `off` afterwards.

## AI usage note

AI assistants may be used for scaffolding, debugging, documentation, and prompt refinement. The final code should be understood by the author and reviewed manually before submission.

## Known limitations

- Sessions are not persisted between page reloads.
- No authentication.
- The app does not claim the AI content is factually perfect.
- No streaming is implemented in the core version because reliability and the assignment's 8-hour limit were prioritized.

## Time spent

Target: approximately 8 hours.

## Suggested demo

1. Generate a session from a topic.
2. Flip a flashcard.
3. Answer a quiz question correctly.
4. Answer one incorrectly.
5. Show the wrong-answer count.
6. Open Retest mistakes.
7. Toggle dark mode.
8. Demonstrate the malformed-JSON error mode.
