# SyncDraw

SyncDraw is a real-time collaborative drawing canvas that allows multiple users to draw together in the same room.

---

## Overview

SyncDraw is designed as a high-performance, real-time collaborative whiteboard platform. Built as an end-to-end TypeScript application, SyncDraw pairs a fluid vector-capable drawing engine on the frontend with an event-driven synchronization backend to enable synchronous sketching, shape rendering, and shared brainstorming rooms.

---

## Current Status

SyncDraw is currently in active stage-by-stage development.

### Implemented Features (Sections 1 – 11)
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
- **Live Collaborative Cursors & Presence Polish (Section 7)**:
  - **Multiplayer Cursor Tracking**: Real-time cursor coordinates broadcast via `CURSOR_MOVE` and `CURSOR_UPDATE` with zero sender echo and room isolation.
  - **Network Throttling**: Client-side 30ms rate-limiting and distance threshold filtering to eliminate unnecessary network traffic.
  - **Decoupled GPU Overlay**: Cursors render in a dedicated DOM overlay (`<CursorOverlay>`) using CSS 3D transforms (`translate3d`), completely decoupled from canvas redraws and React render cycles.
  - **Inactivity Staleness Fading**: Cursors automatically fade to zero opacity after 6 seconds of inactivity, while maintaining active room presence.
  - **Ghost Cursor Cleanup**: Instant cursor element removal and timer teardown on user disconnect (`USER_LEFT`) and room exit.
  - **Polished Presence Roster**: Avatar circles render the user's uppercase initials against their server-assigned color with an active green connection dot and local `(You)` badge.
- **Collaborative Undo/Redo & Operation History (Section 8)**:
  - **Author-Scoped Undo/Redo**: Collaborators can undo and redo their own operations without removing another collaborator's work.
  - **Non-Destructive Operation Log**: Canvas mutations are recorded as immutable operations (`add-stroke`, `erase-strokes`, `clear-canvas`, `undo`, `redo`). Undoing an operation toggles its active state (`active: false`) rather than physically removing it from the log.
  - **Collaborative Clear Canvas**: Clear is a synchronized, reversible operation. Undoing clear restores preceding strokes while preserving subsequent drawings.
  - **Deterministic Canvas Reconstruction**: Replays active operations in chronological order on-demand, guaranteeing visual consistency across all connected clients with zero bitmap snapshots.
  - **Server-Authoritative Validation**: Validates operation payloads, enforces authoritative socket identity, rejects cross-author mutations, and prevents duplicates via `operationId` sets.
  - **Comprehensive State Hydration**: `SYNC_STATE` transmits both compiled strokes and canonical operation logs to newly joined and reconnected peers.
- **Reconnection Reliability, Offline Queue & Safe Replay (Section 9)**:
  - **Authoritative Connection State Machine**: Explicit 5-state client model (`connected`, `connecting`, `reconnecting`, `offline`, `disconnected`) reacting to transport drops, socket reconnect attempts, and browser `online`/`offline` lifecycle events.
  - **Local-First Drawing Resilience**: Drawing, erasing, undo, redo, and clear remain 100% interactive while offline. Local mutations update the canvas immediately with zero latency.
  - **Durable Client-Side Pending Operation Queue (`queue.ts`)**: Pending mutations are enqueued and persisted defensively to `localStorage` under `syncdraw:pending-operations:v1`.
  - **Room & Session Isolation**: Persisted operations are strictly scoped by `roomId` and user display name, preventing any cross-room operation leaks.
  - **Operation Acknowledgement Protocol (`OPERATION_ACK`)**: Direct sender-targeted acknowledgement confirming that an operation has passed validation and committed to canonical state.
  - **Safe Reconnect Reconciliation**: On reconnect + `SYNC_STATE`, the client reconciles local pending operations against server canonical IDs. Already-canonical operations are purged from the queue; only missing unacknowledged operations are replayed.
  - **Server Idempotency**: Duplicate operation IDs sent via retries or retransmissions are acknowledged safely as `ALREADY_CANONICAL` without duplicating room strokes or records.
  - **Ephemeral Cursor Protection**: Live cursor coordinates (`CURSOR_MOVE`) are strictly ephemeral; they are never queued or saved to storage during offline periods.
  - **Offline UI & Pending Counter**: Accessible status indicators (`● Connected`, `↻ Reconnecting...`, `⚠ Offline`) accompanied by a live pending changes pill (`3 changes pending` with `aria-live="polite"`).
  - **In-Memory Room Reconnect Grace Period**: Empty rooms with drawing history are preserved for a 2-minute grace period before eviction, protecting users from state loss during brief network cuts.
- **Performance Optimization, Scalability & Diagnostics (Section 10)**:
  - **Zero-Allocation In-Place Local Drawing**: Eliminates $O(N^2)$ point array spreading during dragging via `appendPointInPlace`, preventing GC pauses and preserving 60–120 FPS.
  - **Remote Drawing `requestAnimationFrame` Coalescing**: Batches incoming remote stroke points into display-synced frame flushes, preventing canvas context setup churn during multi-user drawing.
  - **Compositor-Accelerated Live Cursors**: Cursor transforms use GPU-friendly `translate3d` with `requestAnimationFrame` batching, avoiding layout recalculations and canvas redraws.
  - **$O(1)$ Indexed Operation History**: Client and server operation lookups utilize indexed hash maps (`operationMap`), enabling smooth undo/redo lookups across 5,000+ operations in $< 1.5\text{ms}$.
  - **Debounced Offline Queue Storage**: Rapid acknowledgments and transmission states debounce `localStorage` persistence (50ms), reducing synchronous storage I/O under network burst conditions while preserving immediate durability on enqueue and browser unload.
  - **Component Memoization & Hook Rules**: Pure functional subcomponents (`RoomHeader`, `Toolbar`, `ClearConfirmDialog`) memoized via `React.memo` with stabilized callbacks and strict top-level hook compliance.
  - **Development Diagnostics HUD (`PerfOverlay`)**: Zero-production-overhead HUD tracking rolling FPS, active users, operations, queue depth, and round-trip heartbeat latency (`?debug=true`).
  - **Comprehensive Stress Test Suite**: 6-part automated stress test verifying 1,000-point streams (32k+ pts/sec), 5,000 operations, 10 concurrent collaborators, and rapid reconnect cycling.
- **Security, Rate Limiting & Abuse Hardening (Section 11)**:
  - **Token-Bucket WebSocket Rate Limiting**: Per-socket token-bucket protection against DoS/flooding across `CURSOR_MOVE` (50 burst, 50/s refill), `DRAW_UPDATE` (60 burst, 60/s refill), `OPERATION_APPLY` (120 burst, 60/s refill), and `JOIN_ROOM` (5 burst, 1/s refill), with automatic cleanup on socket disconnect.
  - **Room Resource & Memory Bounds**: Strict capacity limits preventing memory exhaustion (`MAX_USERS_PER_ROOM = 50`, `MAX_ACTIVE_STROKES_PER_USER = 10`, `MAX_ACTIVE_STROKES_PER_ROOM = 100`, `MAX_OPERATIONS_PER_ROOM = 10000`, `MAX_STROKES_PER_ROOM = 5000`) with protocol-level error reporting.
  - **Input Sanitization & Unicode Preservation**: Strips ASCII/Unicode control characters (`[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]`) and normalizes whitespace while preserving valid international Unicode; enforces strict `/^[A-Z0-9_-]{3,24}$/` regex on room IDs.
  - **HTTP & Gateway Defense**: Disabled `X-Powered-By`; enforced defensive HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`, COOP, CORP, API CSP); hardened multi-origin CORS verification.
  - **Client Offline Storage Quota Protection**: Enforces 500-record cap on browser `localStorage` offline queues (`MAX_PENDING_OPERATIONS = 500`) with defensive error recovery on `QuotaExceededError`.
  - **Automated Security Test Suite**: 22 automated attack and abuse test scenarios (`npm run test:security -w server`) covering validation, authorization, rate limiting, and room isolation.

---

## Planned Features

The following features are planned for upcoming development sections:

- **Geometric Shapes & Annotations** *(Planned)*: Rectangle, ellipse, arrow, and text annotation tools.
- **Database & Cloud Room Persistence** *(Planned)*: Persistent database snapshot storage and historical action replay.
- **Canvas Zoom, Pan & Infinite Workspace** *(Planned)*: Infinite viewport navigation and scaling.

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

### Automated Real-Time Test Suites
 
```bash
# Run automated drawing synchronization test suite (11 test cases)
npm run test:drawing -w server

# Run automated live cursor synchronization test suite (7 test cases)
npm run test:cursor -w server

# Run automated collaborative history & undo/redo test suite (16 test cases)
npm run test:history -w server

# Run automated reconnect, offline queue & safe replay test suite (16 test cases)
npm run test:reconnect -w server

# Run automated performance, scalability & stress test suite (6 stress test cases)
npm run test:performance -w server

# Run automated security, abuse & authorization test suite (22 test cases)
npm run test:security -w server
```

---

## License

MIT
