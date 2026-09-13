# SyncDraw Architecture Document

This document describes the architectural foundation of **SyncDraw** ("Real-Time Collaborative Drawing Canvas"), covering current structural choices and planned design layers for future development phases.

---

## 1. High-Level Architecture Overview

```text
Browser (Client)
   │
   │ HTTP (Active) / WebSocket (Planned)
   ▼
Backend (Server)
   │
   │ Room Event Dispatcher (Planned)
   ▼
Room Management (Planned)
   │
   │ CRDT / In-Memory Snapshot Sync (Planned)
   ▼
Collaborative State (Planned)
```

---

## 2. Current Architecture Components (Section 1)

### 2.1 Frontend Foundation (`client/`)
- **Single Page Application (SPA)**: Powered by React 19 and Vite for fast Hot Module Replacement (HMR) and optimized static asset production.
- **Strict TypeScript**: Configured with strict compiler flags (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`) to prevent runtime null/undefined errors across the rendering pipeline.
- **Utility Styling**: Integrated with modern Tailwind CSS to provide a consistent, responsive, high-performance UI design system without CSS bloat.
- **Base Shell**: Provides application scaffolding, responsive layout boundaries, and an active backend connectivity probe.

### 2.2 Backend Foundation (`server/`)
- **Express HTTP Gateway**: Lightweight Node.js server handling REST communication, CORS origin restrictions, and pre-flight validation.
- **Health Check Endpoint**: `GET /health` returns live server status, operational uptime, and timestamp for readiness probes.
- **Prepared HTTP Server**: Uses Node's standard `http.Server` wrapper around Express, ready for WebSocket upgrade hooks in subsequent sections.
- **Centralized Error Handling**: Structured 404 router and 500 error interception ensuring clean API error boundaries.

---

## 3. Planned Architecture Components

Components below represent upcoming milestones and are marked explicitly as *(Planned)*.

### 3.1 Future Canvas Rendering Layer *(Planned)*
- **HTML5 Canvas / OffscreenCanvas**: Native 2D context rendering engine capable of high frame rates (60fps+) during continuous input.
- **Stroke Representation**: Drawing operations modeled as immutable vector path commands (points array, stroke width, color, tool type) rather than raw raster bitmaps.
- **Input Pipeline**: Pointer event listeners handling touch, mouse, and stylus pressure sensitivity with quadratic Bézier smoothing to avoid jagged lines.
- **Local Double Buffering**: Offscreen canvas layer to decouple active stroke rendering from background grid and static canvas elements.

### 3.2 Future WebSocket Layer *(Planned)*
- **Protocol**: Bidirectional event-driven protocol implemented over WebSocket (`ws` or `Socket.io`).
- **Transport Security & Framing**: Lightweight binary or JSON message envelopes containing message type, room ID, user ID, client timestamp, and payload.
- **Optimistic Broadcast**: Drawing actions rendered instantly to the local canvas while being pushed asynchronously to the WebSocket channel to eliminate perceived latency.
- **Reconnection & Heartbeats**: Periodic ping-pong frames for zombie connection cleanup and exponential backoff reconnection handling.

### 3.3 Future Room Management Layer *(Planned)*
- **Namespace & Room Isolation**: Independent room instances identified by unique room IDs (UUID / nanoid).
- **Session Registry**: In-memory mapping of active rooms, connected socket client IDs, and per-user metadata (display name, assigned cursor color).
- **Lifecycle Management**: Auto-cleanup of empty rooms after timeout or persistence to store.

### 3.4 Future Collaborative State Layer *(Planned)*
- **Operation History & Log**: Chronological drawing command log maintained per room for playback and late-joining clients.
- **Cursor Synchronization**: High-frequency cursor position broadcasting throttled to ~30-60Hz to conserve network bandwidth while preserving smoothness.
- **Undo / Redo Architecture**: Layered action stack allowing users to undo their own operations without corrupting concurrent strokes from teammates.

---

## 4. Directory Structure

```text
syncdraw/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── components/         # UI elements (Header, StatusBadge)
│   │   ├── types/              # Client type contracts
│   │   ├── utils/              # Utility helpers
│   │   ├── App.tsx             # Root application shell
│   │   ├── index.css           # Styling foundation
│   │   └── main.tsx            # Client entry point
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                     # Backend Application
│   ├── src/
│   │   ├── types/              # Server type contracts
│   │   └── server.ts           # Express server & health endpoint
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── ARCHITECTURE.md
├── package.json                # Root orchestration & workspaces
└── README.md
```
