# SyncDraw Architecture Document

This document describes the architectural foundation of **SyncDraw** ("Real-Time Collaborative Drawing Canvas"), covering current structural choices and planned design layers for future development phases.

---

## 1. High-Level Flow Architecture

```text
Landing Page (/)
    │
    │  • Hero & Product Preview
    │  • Planned Capabilities
    ▼
Create / Join Room Modal Dialogs
    │
    │  • Display Name Validation
    │  • URL-Safe Room ID Generation / Normalization
    │  • Transient Client-Side Session Storage (sessionStorage)
    ▼
Room Route (/room/:roomId)
    │
    │  • Room ID Validation & Shareable Link
    │  • Direct URL Entry Participant Name Prompt
    │  • Room Workspace Placeholder
    ▼
Future WebSocket Collaboration Layer (Planned — Section 4+)
    │
    │  • Bidirectional Delta Broadcasting
    │  • Live Presence & Cursor Coordinates
    ▼
Future Canvas Engine (Planned — Section 3)
    │
    │  • Native HTML5 2D Path Rendering
    │  • Vector Double Buffering
```

---

## 2. Current Architecture Components

### 2.1 Routing & Navigation (`client/`)
- **React Router**: Client-side declarative routing configuration managing:
  - `/` -> `HomePage` (Landing page, capabilities, modals)
  - `/room/:roomId` -> `RoomPage` (Room workspace placeholder with direct link entry support)
  - `*` -> `NotFoundPage` (Clean 404 recovery)
- **Room ID Management**:
  - `generateRoomId()`: Employs an unambiguous alphanumeric character set (excluding 0/O, 1/I) to produce 6-character room codes (e.g. `ABC7KQ`).
  - `isValidRoomId()`: Enforces 3–24 character bounds and URL-safe characters (`[A-Z0-9_-]`).
- **Temporary Client-Side Session State**:
  - `sessionStorage` wrapper retains transient user display names across page navigation in the current browser tab.
  - *Architectural Note*: This is strictly transient state storage, not authentication. Authoritative room membership and persistent user sessions will be enforced on the server in future collaboration phases.

### 2.2 Accessible Dialog System
- **Modal Architecture**:
  - Semantic `role="dialog"` and `aria-modal="true"`.
  - Global `Escape` key listener for immediate dismissal.
  - Automatic focus management targeting the initial input field on modal mount.
  - Restores focus to the triggering element upon dialog closure.
  - Background overlay click-to-close with scroll containment.

### 2.3 Backend Foundation (`server/`)
- **Express HTTP Gateway**: Lightweight Node.js server handling REST communication, CORS origin restrictions, and pre-flight validation.
- **Health Check Endpoint**: `GET /health` returns live server status, operational uptime, and timestamp for readiness probes.
- **Prepared HTTP Server**: Uses Node's standard `http.Server` wrapper around Express, ready for WebSocket upgrade hooks in subsequent sections.

---

## 3. Planned Architecture Components

Components below represent upcoming milestones and are marked explicitly as *(Planned)*.

### 3.1 Future Canvas Rendering Layer *(Planned — Section 3)*
- **HTML5 Canvas / OffscreenCanvas**: Native 2D context rendering engine capable of high frame rates (60fps+) during continuous input.
- **Stroke Representation**: Drawing operations modeled as immutable vector path commands (points array, stroke width, color, tool type) rather than raw raster bitmaps.
- **Input Pipeline**: Pointer event listeners handling touch, mouse, and stylus pressure sensitivity with quadratic Bézier smoothing.
- **Local Double Buffering**: Offscreen canvas layer to decouple active stroke rendering from background grid and static canvas elements.

### 3.2 Future WebSocket Layer *(Planned — Section 4+)*
- **Protocol**: Bidirectional event-driven protocol implemented over WebSocket (`ws` or `Socket.io`).
- **Transport Security & Framing**: Lightweight binary or JSON message envelopes containing message type, room ID, user ID, client timestamp, and payload.
- **Optimistic Broadcast**: Drawing actions rendered instantly to the local canvas while being pushed asynchronously to the WebSocket channel.
- **Live Presence & Cursor Sync**: Coordinate broadcasting throttled to ~30-60Hz with participant color coding.

### 3.3 Future Room Management Layer *(Planned)*
- **Namespace & Room Isolation**: Independent room instances identified by unique room IDs.
- **Session Registry**: In-memory mapping of active rooms, connected socket client IDs, and per-user metadata.
- **Persistence**: Snapshot serializations and state recovery for room rejoiners.

---

## 4. Current Directory Structure

```text
mindforge/ (SyncDraw Workspace Root)
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   └── Modal.tsx           # Accessible modal dialog with focus management
│   │   │   ├── CreateRoomDialog.tsx    # Modal form with room ID generation
│   │   │   ├── FeatureSection.tsx      # Core capabilities grid
│   │   │   ├── Header.tsx              # Brand header with CTA
│   │   │   ├── Hero.tsx                # Hero section with brand taglines
│   │   │   ├── JoinRoomDialog.tsx      # Modal form with room ID validation
│   │   │   ├── ProductPreview.tsx      # Honest static canvas preview
│   │   │   ├── RoomHeader.tsx          # Room bar with 1-click link sharing
│   │   │   └── StatusBadge.tsx         # Connection indicator component
│   │   ├── pages/
│   │   │   ├── HomePage.tsx            # Landing page layout
│   │   │   ├── NotFoundPage.tsx        # 404 route
│   │   │   └── RoomPage.tsx            # Room placeholder with direct URL entry
│   │   ├── types/
│   │   │   ├── index.ts                # Central types export
│   │   │   └── room.ts                 # Room, session, and modal type contracts
│   │   ├── utils/
│   │   │   ├── cn.ts                   # Class name helper
│   │   │   ├── roomId.ts               # Room ID generation, normalization, validation
│   │   │   └── storage.ts              # Session storage wrapper
│   │   ├── App.tsx                     # React Router definition
│   │   ├── index.css                   # Tailwind CSS v4 styling
│   │   ├── main.tsx                    # Client entry point
│   │   └── vite-env.d.ts               # Vite types
│   ├── .env.example
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── server.ts                   # Express server & health endpoint
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── ARCHITECTURE.md
├── package.json                        # Root workspace orchestration
└── README.md
```
