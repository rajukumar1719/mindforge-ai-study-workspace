# SyncDraw

SyncDraw is a real-time collaborative drawing canvas that allows multiple users to draw together in the same room.

---

## Overview

SyncDraw is designed as a high-performance, real-time collaborative whiteboard platform. Built as an end-to-end TypeScript application, SyncDraw pairs a fluid vector-capable drawing engine on the frontend with an event-driven synchronization backend to enable synchronous sketching, shape rendering, and shared brainstorming rooms.

---

## Current Status

SyncDraw is currently in active stage-by-stage development.

### Implemented Features (Sections 1 – 3)
- **Full-Stack TypeScript Architecture**: Monorepo structure using npm workspaces (`client/` and `server/`), strict TypeScript, and ESLint.
- **Backend Foundation**: Node.js + Express REST gateway with `/health` monitoring, CORS handling, and graceful shutdown.
- **Product Landing Page**: Responsive hero, brand wordmark, capabilities preview, and static architectural illustration.
- **Room Entry Flows**:
  - Create Room: Display name validation, collision-resistant 6-character room ID generation (`ABC7KQ`), session identity caching, and routing.
  - Join Room: Room code validation and uppercase normalization.
  - Direct Link Handling: Automatic participant name prompt for direct `/room/:roomId` links.
- **Accessible Modal System**: Focus trapping, `Escape` key dismissal, backdrop click handling, and ARIA attributes.
- **Local Canvas Drawing Engine (Section 3)**:
  - High-performance HTML5 Canvas 2D engine decoupled from React re-renders.
  - Unified Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) supporting mouse, touch, and stylus.
  - Smooth quadratic Bézier curve interpolation for fluid whiteboard stroke rendering.
  - High-DPI / Retina resolution scaling (`devicePixelRatio` correction).
  - Dynamic `ResizeObserver` maintaining stroke integrity and redrawing without loss.
  - Professional floating toolbar with Pen tool, 6-color palette (`Charcoal`, `Indigo`, `Rose`, `Emerald`, `Amber`, `Violet`), and 4 brush sizes (`2px`, `4px`, `8px`, `14px`).
  - Subtle empty state guide (*"Start drawing anywhere..."*) that dismisses on first stroke.
  - Canonical immutable stroke data model ready for WebSocket delta sync.

---

## Planned Features

The following features are planned for upcoming development sections:

- **Real-Time Collaboration** *(Planned — Section 4+)*: Bidirectional WebSocket synchronization, low-latency delta broadcasting, and optimistic local rendering.
- **Live Collaborative Cursors** *(Planned)*: Synchronized multiplayer mouse cursors displaying teammate names and distinct user color tags.
- **Collaborator Presence** *(Planned)*: Real-time room participant rosters and presence heartbeats.
- **Collaborative State Management** *(Planned)*: Undo / Redo history stacks, conflict resolution, and deterministic canvas convergence.
- **Canvas Expansion Tools** *(Planned)*: Eraser tool, highlighter, geometric shapes (rectangle, circle, arrow), and text annotations.
- **Persistence & Export** *(Planned)*: Canvas snapshot export to PNG/SVG/JSON, with room state persistence.
- **Offline Resilience & Reconnection** *(Planned)*: Reconnection queue buffering drawing actions during network blips.

---

## Tech Stack

### Frontend (`client`)
- **Framework**: React 19
- **Routing**: React Router v7 (`react-router-dom`)
- **Canvas Engine**: Native HTML5 Canvas 2D Context + Quadratic Bézier Smoothing
- **Language**: TypeScript (Strict Mode)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Linting**: ESLint flat config with `typescript-eslint` & `eslint-plugin-react-hooks`

### Backend (`server`)
- **Runtime**: Node.js
- **Language**: TypeScript (Strict Mode)
- **Web Framework**: Express
- **Tooling**: `tsx` (TypeScript Execute / Watch)

---

## Development Setup

### Prerequisites
- Node.js 20+ (tested on Node v24)
- npm 10+ (or 11+)

### Installation

Clone the repository and install dependencies from the project root:

```bash
# Install dependencies for both client and server workspaces
npm install
```

### Environment Configuration

Copy the example environment configuration files:

```bash
# Client configuration
cp client/.env.example client/.env

# Server configuration
cp server/.env.example server/.env
```

### Running in Development

Run both client and server concurrently:

```bash
npm run dev
```

Alternatively, run each workspace individually:

```bash
# Run server only (starts on http://localhost:5000)
npm run dev:server

# Run client only (starts on http://localhost:5173)
npm run dev:client
```

### Build & Type Verification

```bash
# Run TypeScript strict typecheck across all workspaces
npm run typecheck

# Run ESLint on client
npm run lint

# Build both client and server for production
npm run build
```

---

## License

MIT
