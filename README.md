# SyncDraw

SyncDraw is a real-time collaborative drawing canvas that allows multiple users to draw together in the same room.

---

## Overview

SyncDraw is designed as a high-performance, real-time collaborative whiteboard platform. Built as an end-to-end TypeScript application, SyncDraw pairs a fluid vector-capable drawing engine on the frontend with an event-driven synchronization backend to enable synchronous sketching, shape rendering, and shared brainstorming rooms.

---

## Current Status

SyncDraw is currently in active stage-by-stage development.

### Implemented Features (Sections 1 – 4)
- **Full-Stack TypeScript Architecture**: Monorepo structure using npm workspaces (`client/` and `server/`), strict TypeScript, and ESLint.
- **Backend Foundation**: Node.js + Express REST gateway with `/health` monitoring, CORS handling, and graceful shutdown.
- **Product Landing Page**: Responsive hero, brand wordmark, capabilities preview, and static architectural illustration.
- **Room Entry Flows**:
  - Create Room: Display name validation, collision-resistant 6-character room ID generation (`ABC7KQ`), session identity caching, and routing.
  - Join Room: Room code validation and uppercase normalization.
  - Direct Link Handling: Automatic participant name prompt for direct `/room/:roomId` links.
- **Accessible Modal System**: Focus trapping, `Escape` key dismissal, backdrop click handling, and ARIA attributes.
- **Core Canvas Engine**: Native HTML5 Canvas 2D engine with unified Pointer Events, high-DPI retina scaling, `ResizeObserver` resilience, and quadratic Bézier curve smoothing.
- **Complete Local Drawing Toolset (Section 4)**:
  - **Pen Tool**: Fluid, opaque vector strokes with round caps and joins.
  - **Highlighter Tool**: Semi-transparent rendering (`0.35` alpha), wider brush presets, smooth curve smoothing.
  - **Stroke-Level Eraser**: Real-time geometric intersection hit testing that cleanly removes touched strokes.
  - **Color Palette**: 6 curated presets (`Charcoal`, `Indigo`, `Rose`, `Emerald`, `Amber`, `Violet`) with active indicators (disabled during erasing).
  - **Brush Sizing**: 5 presets (`2px Fine`, `4px Normal`, `8px Medium`, `14px Broad`, `24px Heavy`) affecting Pen, Highlighter, and Eraser.
  - **Logical Undo / Redo**: Operation history stack tracking reversible additions, deletions, and clears without memory-heavy raster snapshots.
  - **Clear Canvas Confirmation**: Accessible dialog with keyboard confirmation (`Enter`) and dismissal (`Escape`). Clear is also undoable!
  - **PNG Blob Export**: 1-click standalone canvas snapshot download without UI chrome (`syncdraw-{roomId}.png`).
  - **Keyboard Shortcuts**: `P` (Pen), `H` (Highlighter), `E` (Eraser), `Ctrl/Cmd+Z` (Undo), `Ctrl/Cmd+Shift+Z` (Redo), `Escape` (Close Dialogs). Suppressed when typing in form inputs.

---

## Planned Features

The following features are planned for upcoming development sections:

- **Real-Time Collaboration** *(Planned — Section 5+)*: Bidirectional WebSocket synchronization, low-latency delta broadcasting, and optimistic local rendering.
- **Live Collaborative Cursors** *(Planned)*: Synchronized multiplayer mouse cursors displaying teammate names and distinct user color tags.
- **Collaborator Presence** *(Planned)*: Real-time room participant rosters and presence heartbeats.
- **Multiplayer Conflict Resolution** *(Planned)*: Collaborative undo/redo trees, operational transforms / CRDT convergence.
- **Geometric Shapes & Annotations** *(Planned)*: Rectangle, ellipse, arrow, and text annotation tools.
- **Room State Persistence** *(Planned)*: Server-side room snapshot storage and historical action replay for late-joining clients.
- **Offline Resilience & Reconnection** *(Planned)*: Reconnection queue buffering drawing actions during network blips.

---

## Tech Stack

### Frontend (`client`)
- **Framework**: React 19
- **Routing**: React Router v7 (`react-router-dom`)
- **Canvas Engine**: Native HTML5 Canvas 2D Context + Quadratic Bézier Smoothing + Geometric Hit Testing
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

## Keyboard Shortcuts

| Key | Action | Description |
|---|---|---|
| `P` | Pen Tool | Selects standard drawing pen |
| `H` | Highlighter Tool | Selects semi-transparent highlighter |
| `E` | Eraser Tool | Selects stroke-level object eraser |
| `Ctrl+Z` / `Cmd+Z` | Undo | Reverts previous drawing / erasing operation |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo | Restores previously undone operation |
| `Escape` | Close Dialog | Closes open modals or confirmation dialogs |

*Note: Drawing shortcuts are automatically disabled while focused on text input fields.*

---

## Development Setup

### Prerequisites
- Node.js 20+ (tested on Node v24)
- npm 10+ (or 11+)

### Installation

```bash
# Install dependencies across client and server workspaces
npm install
```

### Environment Configuration

```bash
# Client configuration
cp client/.env.example client/.env

# Server configuration
cp server/.env.example server/.env
```

### Running in Development

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
