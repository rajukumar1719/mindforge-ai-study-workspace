# SyncDraw

SyncDraw is a real-time collaborative drawing canvas that allows multiple users to draw together in the same room.

---

## Overview

SyncDraw is designed as a high-performance, real-time collaborative whiteboard platform. Built as an end-to-end TypeScript application, SyncDraw pairs a fluid vector-capable drawing engine on the frontend with an event-driven synchronization backend to enable synchronous sketching, shape rendering, and shared brainstorming rooms.

---

## Current Status

SyncDraw is currently in active stage-by-stage development.

### Implemented Features (Sections 1 – 5)
- **Full-Stack TypeScript Architecture**: Monorepo structure using npm workspaces (`client/` and `server/`), strict TypeScript, and ESLint.
- **Backend Infrastructure**: Node.js + Express REST gateway with `/health` monitoring, CORS handling, and graceful shutdown.
- **Product Landing Page**: Responsive hero, brand wordmark, capabilities preview, and static architectural illustration.
- **Room Entry Flows**:
  - Create Room: Display name validation, collision-resistant 6-character room ID generation (`ABC7KQ`), session identity caching, and routing.
  - Join Room: Room code validation and uppercase normalization.
  - Direct Link Handling: Automatic participant name prompt for direct `/room/:roomId` links.
- **Accessible Modal System**: Focus trapping, `Escape` key dismissal, backdrop click handling, and ARIA attributes.
- **Core Canvas Engine**: Native HTML5 Canvas 2D engine with unified Pointer Events, high-DPI retina scaling, `ResizeObserver` resilience, and quadratic Bézier curve smoothing.
- **Complete Local Drawing Toolset**:
  - Pen, Highlighter (`0.35` alpha), and Stroke-Level Eraser with mathematical point-to-segment geometric hit detection.
  - Color palette (6 presets) and brush sizing (5 presets).
  - Logical Undo / Redo operation history stack.
  - Clear canvas with accessible confirmation dialog.
  - Blob-based PNG export (`syncdraw-{roomId}.png`).
  - Keyboard shortcuts (`P`, `H`, `E`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Escape`).
- **Real-Time Backend & WebSocket Foundation (Section 5)**:
  - **Socket.IO Real-Time Gateway**: Dedicated bidirectional WebSocket server attached to HTTP server.
  - **In-Memory RoomManager**: Authoritative room lifecycle, member tracking, and automatic cleanup of empty rooms.
  - **Server-Authoritative Identity**: Server generates socket IDs and assigns distinct collaborator colors (`#4f46e5`, `#059669`, `#d97706`, `#e11d48`, etc.) from an accessible palette.
  - **Strict Room Isolation**: Socket.IO room namespaces prevent cross-room message leakage.
  - **Typed Protocol**: Structured `JOIN_ROOM`, `ROOM_JOINED`, `USER_JOINED`, `USER_LEFT`, and `ERROR` events with runtime shape validation.
  - **Live User Presence**: Header displays dynamic collaborator count and popover roster with color indicators and "(You)" tag.
  - **Real Connection Status**: Dynamic badge displaying `Connected`, `Connecting...`, `Reconnecting...`, and `Disconnected`.
  - **Reconnection Handling**: Automatic rejoining on reconnect without duplicate presence entries.
  - *Note*: Canvas drawing operates locally; drawing synchronization will follow in Section 6.

---

## Planned Features

The following features are planned for upcoming development sections:

- **Real-Time Drawing Synchronization** *(Planned — Section 6)*: Low-latency stroke delta broadcasting (`DRAW_START`, `DRAW_UPDATE`, `DRAW_END`) and optimistic local rendering.
- **Live Collaborative Cursors** *(Planned)*: Synchronized multiplayer mouse cursors displaying teammate names and distinct user color tags.
- **Collaborative State History** *(Planned)*: Synchronized undo/redo trees, conflict resolution, and deterministic canvas convergence.
- **Geometric Shapes & Annotations** *(Planned)*: Rectangle, ellipse, arrow, and text annotation tools.
- **Room State Persistence** *(Planned)*: Server-side room snapshot storage and historical action replay for late-joining clients.
- **Offline Resilience & Operation Queue** *(Planned)*: Reconnection queue buffering drawing actions during network drops.

---

## Tech Stack

### Frontend (`client`)
- **Framework**: React 19
- **Routing**: React Router v7 (`react-router-dom`)
- **Real-Time Client**: Socket.IO Client (`socket.io-client`)
- **Canvas Engine**: Native HTML5 Canvas 2D Context + Quadratic Bézier Smoothing + Geometric Hit Testing
- **Language**: TypeScript (Strict Mode)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Linting**: ESLint flat config with `typescript-eslint` & `eslint-plugin-react-hooks`

### Backend (`server`)
- **Runtime**: Node.js
- **Real-Time Gateway**: Socket.IO Server (`socket.io`)
- **Web Framework**: Express
- **Language**: TypeScript (Strict NodeNext)
- **Tooling**: `tsx` (TypeScript Execute / Watch)

---

## Keyboard Shortcuts

| Key | Action | Scope |
|---|---|---|
| `P` | Pen Tool | Global |
| `H` | Highlighter Tool | Global |
| `E` | Eraser Tool | Global |
| `Ctrl+Z` / `Cmd+Z` | Undo | Global |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo | Global |
| `Escape` | Close Dialog | Global |

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
