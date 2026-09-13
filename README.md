# SyncDraw

SyncDraw is a real-time collaborative drawing canvas that allows multiple users to draw together in the same room.

---

## Overview

SyncDraw is designed as a high-performance, real-time collaborative whiteboard platform. Built as an end-to-end TypeScript application, SyncDraw pairs a fluid vector-capable drawing engine on the frontend with an event-driven synchronization backend to enable synchronous sketching, shape rendering, and shared brainstorming rooms.

---

## Current Status

SyncDraw is currently in active stage-by-stage development.

### Implemented Features (Sections 1 – 6)
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
  - Dedicated bidirectional Socket.IO gateway with isolated room namespaces.
  - In-memory `RoomManager` with automatic resource cleanup when rooms empty.
  - Server-authoritative collaborator identities and accessible palette colors.
  - Live presence count and collaborator avatar stack with tooltip badges.
  - Dynamic connection status (`Connecting...`, `Connected`, `Reconnecting...`, `Disconnected`).
  - Reconnection resilience with duplicate presence prevention.
- **Real-Time Drawing Synchronization (Section 6)**:
  - **Structured Stroke Synchronization**: Synchronizes lightweight vector drawing operations (`DRAW_START`, `DRAW_UPDATE`, `DRAW_END`, `ERASE_STROKES`) rather than heavy canvas screenshots or bitmap diffs.
  - **Local-First Zero-Latency Rendering**: Local strokes render immediately at native screen refresh rates (60–120Hz); network transmission is batched and asynchronous.
  - **Incremental Remote Rendering**: Remote points render incrementally on the 2D canvas context via Bézier segments without full-canvas redraws or React state churn per point.
  - **Multi-Tool Collaboration**: Synchronizes Pen, Highlighter (with alpha transparency), and Stroke-Level Eraser across concurrent users.
  - **Simultaneous Multi-User Drawing**: Multiple users can draw at the exact same moment without stroke collision or overwriting.
  - **Batched Network Dispatch & Point Reduction**: Point updates are buffered and flushed in $\sim 25\text{ms}$ windows ($\sim 40\text{ updates/sec}$) with Euclidean distance filtering to prevent WebSocket flooding.
  - **Late-Join Initial State Hydration (`SYNC_STATE`)**: Late-joining participants immediately receive the room's canonical strokes on join.
  - **Strict Room Isolation**: Drawing events are routed exclusively to peers in the same room.
  - **Defensive Validation & Ghost Stroke Elimination**: Rigorous validation on stroke IDs, tools, colors, and coordinates; incomplete strokes from disconnected clients are cleanly finalized and purged.

---

## Planned Features

The following features are planned for upcoming development sections:

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
