# SyncDraw

SyncDraw is a real-time collaborative drawing canvas that allows multiple users to draw together in the same room.

---

## Overview

SyncDraw is designed as a high-performance, real-time collaborative whiteboard platform. Built as an end-to-end TypeScript application, SyncDraw pairs a fluid vector-capable drawing engine on the frontend with an event-driven synchronization backend to enable synchronous sketching, shape rendering, and shared brainstorming rooms.

---

## Current Status

SyncDraw is currently in active stage-by-stage development.

- **Section 1 (Project Foundation)**: Completed
  - Full-stack TypeScript repository structure initialized (`client/` and `server/` orchestrated via npm workspaces).
  - React + Vite + Tailwind CSS frontend shell established with strict type checking.
  - Node.js + Express backend foundation configured with environment management, `/health` endpoint, and graceful shutdown.
  - Development tooling, strict typing, and build pipelines verified.

- **Section 2 (Landing Page + Room Entry Flows)**: Completed
  - Clean, developer-grade landing page with SyncDraw branding, hero tagline, and capabilities preview.
  - Accessible modal dialog system with keyboard focus management and `Escape` key dismissal.
  - Create Room flow: Display name validation, URL-safe room ID generation (e.g. `ABC7KQ`), session identity caching, and navigation to `/room/:roomId`.
  - Join Room flow: Display name and room code validation, room ID normalization, and direct routing.
  - Client-side routing (`/`, `/room/:roomId`, `*`) using React Router.
  - Room Page Placeholder: Direct link entry handling with participant name prompt, URL-safe room code validation, 1-click room link sharing, and explicit status indicators.
  - Friendly 404 Not Found route.

- **Subsequent Sections**: Under development (see Planned Features below).

---

## Planned Features

The following features are planned for upcoming development sections:

- **Interactive Drawing Engine** *(Planned — Section 3)*: Freehand pen tool, highlighter, dynamic brush stroke smoothing, customizable stroke color/width, and geometric shapes.
- **Canvas Operations** *(Planned)*: Pan, zoom, responsive resize handling, canvas clear, and grid overlay.
- **Real-Time Collaboration** *(Planned — Section 4+)*: Bidirectional WebSocket synchronization, low-latency delta broadcasting, and optimistic local rendering.
- **Room Management & Persistence** *(Planned)*: Authoritative server-side room registry, active participant presence tracking, and state persistence.
- **Live Collaborative Cursors** *(Planned)*: Synchronized multiplayer mouse cursors displaying teammate names and distinct user color tags.
- **State History & Conflict Resolution** *(Planned)*: Local and remote undo/redo management, chronological action history stack, and deterministic convergence.
- **Persistence & Export** *(Planned)*: Canvas snapshot export to PNG/SVG/JSON.
- **Offline Resilience** *(Planned)*: Reconnection queue buffering drawing actions during network blips.

---

## Tech Stack

### Frontend (`client`)
- **Framework**: React 19
- **Routing**: React Router v7 (`react-router-dom`)
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
