# SyncDraw Architecture Document

This document details the architectural foundation, rendering mechanics, local operation model, and real-time communication infrastructure of **SyncDraw** ("Real-Time Collaborative Drawing Canvas"), covering current structural choices and planned design layers for future development phases.

---

## 1. High-Level System Flow

```text
Browser A (Room ABC123)       Browser B (Room ABC123)       Browser C (Room XYZ789)
       │                             │                             │
       │ Socket.IO                   │ Socket.IO                   │ Socket.IO
       ▼                             ▼                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SyncDraw Real-Time Server Gateway                    │
│             (Express HTTP + Socket.IO on Node.js / TS)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │ In-Memory Registry  │
                         │    (RoomManager)    │
                         └──────────┬──────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
┌─────────────────────────┐                   ┌─────────────────────────┐
│      Room ABC123        │                   │       Room XYZ789       │
│  ├── User A (#4f46e5)   │                   │  └── User C (#0891b2)   │
│  └── User B (#059669)   │                   │                         │
│  (Isolated Namespace)   │                   │  (Isolated Namespace)   │
└─────────────────────────┘                   └─────────────────────────┘
```

> [!NOTE]
> **Section 7 Complete**: Live collaborative cursors and presence polish are fully implemented. Real-time multiplayer cursor movements stream smoothly via throttled Socket.IO events (`CURSOR_MOVE` / `CURSOR_UPDATE`) and render on a dedicated GPU-composited overlay layer (`translate3d`), completely decoupled from canvas redraws and React state churn. Presence displays colored initial avatar bubbles with active status indicators. Collaborative undo/redo and collaborative clear are scheduled for Section 8.

---

## 2. Real-Time Architecture & Presence (Section 5)

### 2.1 Technology Choice: Socket.IO
Socket.IO was selected over native raw WebSockets to provide:
- **Built-in Room Namespaces**: Native `socket.join(roomId)` and `socket.to(roomId)` primitives provide server-enforced channel isolation without bespoke routing logic.
- **Heartbeat & Zombie Detection**: Automatic ping/pong frames detect network drops and cleanly trigger disconnect events.
- **Reliable Fallback & Reconnection**: Exponential backoff reconnection with buffer management during transient drops.

### 2.2 Server Authority & Collaborator Identity
To prevent spoofing or conflicting identities:
- **Authoritative IDs**: The server uses the unique socket connection ID (`socket.id`) as the authoritative user identifier. Client-provided user IDs are not accepted.
- **Display Name Validation**: The client-provided display name is strictly validated (2–30 characters, trimmed, sanitized) before being accepted into the room roster.
- **Deterministic Color Assignment**: Collaborator colors are assigned server-side from an accessible 10-color palette. The algorithm inspects active users in the room and assigns the least-used color to minimize duplicates.

```typescript
interface Collaborator {
  id: string;        // Server-generated socket ID
  name: string;      // Validated display name
  color: string;     // Server-assigned distinct hex color
  joinedAt: number;  // Epoch timestamp (ms)
}
```

### 2.3 Room Manager & Lifecycle (`RoomManager`)
The in-memory `RoomManager` acts as the single source of truth on the server:
- `createRoom(roomId)`: Instantiates isolated room state containers.
- `addUser(roomId, user)`: Adds collaborator to the room's user map.
- `removeUser(roomId, userId)`: Removes collaborator and invokes cleanup.
- **Automatic Resource Cleanup**: When the last participant leaves a room, `deleteRoomIfEmpty` removes the room entry from memory, preventing resource leaks.

### 2.4 Event Protocol & Runtime Validation
All client-to-server events undergo strict runtime shape validation before processing:
- `JOIN_ROOM`: Payload `{ roomId, displayName }` validated against length limits and regex bounds (`[A-Z0-9_-]`). Malformed payloads trigger an immediate `ERROR` event without crashing the process.
- `ROOM_JOINED`: Server acknowledges joining socket with `{ roomId, user, collaborators }`.
- `USER_JOINED`: Server broadcasts `{ user }` strictly to peers in the same room.
- `USER_LEFT`: Server broadcasts `{ userId }` on disconnect to remaining room members.
- `ERROR`: Structured error response `{ code, message }` (e.g., `INVALID_ROOM_ID`, `INVALID_DISPLAY_NAME`).

### 2.5 Reconnection & Duplicate Prevention
- On the client, `createCollaborationClient` listens to Socket.IO reconnect events.
- Upon reconnect, the client automatically re-emits `JOIN_ROOM` with the newly assigned socket ID.
- The server checks whether the socket was previously registered in a room and cleans up prior associations before re-admitting, ensuring zero duplicate presence entries.
- Dedicated teardown functions unbind all socket event listeners upon React component unmount, preventing memory leaks and listener accumulation.

---

## 3. Real-Time Drawing Synchronization (Section 6)

SyncDraw synchronizes structured drawing operations rather than raster canvas bitmaps, base64 images, or entire canvas screenshots. This preserves vector resolution, bandwidth efficiency, and client responsiveness.

### 3.1 Network Topology & Multi-Room Routing
```text
Browser A
     │
     │ DRAW_START / UPDATE / END / ERASE
     ▼
Socket.IO Server (Authoritative Gateway)
     │
     ├── Room A
     │     ├── User A (Drawing)
     │     ├── User B (Receives Incremental Render)
     │     └── strokes: [Stroke1, Stroke2, ...]
     │
     └── Room B (Isolated Namespace)
           └── User C (Receives 0 Events from Room A)
```

- **Zero Echo**: When User A draws, strokes are rendered locally immediately. The server broadcasts using `socket.to(roomId).emit(...)`, which reaches User B but does not echo back to User A.
- **Strict Room Isolation**: Sockets in `Room A` cannot send or receive events from `Room B`. Drawing payloads from unauthenticated or foreign sockets are rejected.

### 3.2 Drawing Protocol & Event Lifecycle

```text
Local Interaction                    Network Transmission                   Remote Client
      │                                       │                                   │
 Pointer Down                                 │                                   │
      ├────── Render 1st dot locally          │                                   │
      └───────────────────────────────►  DRAW_START   ──────────────────────►  Receive START
                                              │                                   ├─ Initialize remote stroke
 Pointer Move                                 │                                   └─ Render initial dot
      ├────── Render Bézier locally           │                                   │
      └────── Batch points (~25ms) ───►  DRAW_UPDATE  ──────────────────────►  Receive UPDATE
                                              │                                   ├─ Append points
 Pointer Up                                   │                                   └─ Incremental segment render
      ├────── Finalize local stroke           │                                   │
      ├────── Flush batch & emit ─────►   DRAW_END    ──────────────────────►  Receive END
      └────── Store in local state            │                                   ├─ Move to canonical strokes
                                              │                                   └─ Clear from active tracking
```

#### Event Payloads:
| Event | Direction | Payload Structure | Purpose |
|---|---|---|---|
| `DRAW_START` | Client $\leftrightarrow$ Server | `{ strokeId, tool, color, width, point, [userId] }` | Initiates new remote stroke tracking. |
| `DRAW_UPDATE` | Client $\leftrightarrow$ Server | `{ strokeId, points: Point[], [userId] }` | Batched array of points for incremental curve continuation. |
| `DRAW_END` | Client $\leftrightarrow$ Server | `{ strokeId, [userId] }` | Signals stroke completion; commits stroke to canonical list. |
| `ERASE_STROKES` | Client $\leftrightarrow$ Server | `{ operationId, strokeIds: string[], [userId] }` | Synchronizes logical stroke deletions across room peers. |
| `SYNC_STATE` | Server $\to$ Client | `{ strokes: Stroke[] }` | Delivers complete canonical drawing state to newly joined clients. |

### 3.3 Performance Architecture: Local-First & Incremental Rendering
- **Immediate Local Feedback**: Local strokes are drawn directly onto the HTML5 2D canvas context on pointer events at native display refresh rates (60–120Hz).
- **Decoupled Network Pipeline**: The local rendering pipeline does not await network round-trips or server acknowledgments.
- **Batching & Backpressure**: During pointer movement, points are queued into a buffer and dispatched in batches every $\sim 25\text{ms}$ ($\sim 40\text{ packets/sec}$). This eliminates WebSocket congestion without introducing visual latency.
- **Point Reduction**: Successive points closer than $1.0\text{px}$ Euclidean distance are filtered prior to transmission, saving $30\text{--}40\%$ network payload without impacting visual fidelity.
- **Incremental Remote Rendering**: When `DRAW_UPDATE` arrives at a receiving client, only the newest segment is rendered using `renderIncrementalSegment(ctx, stroke.points, ...)`. The canvas is **never redrawn in full** for high-frequency point updates.

### 3.4 Logical Eraser Synchronization
- Eraser interactions operate at the **stroke level** rather than drawing white pixels or transmitting pixel diffs.
- When an eraser gesture intersects strokes, the client emits `ERASE_STROKES` with the array of affected `strokeIds`.
- The server validates the operation, filters those strokes out of the authoritative `room.strokes` collection, and broadcasts `ERASE_STROKES` to peers.
- Peer clients remove the specified strokes from their logical state and trigger a single clean canvas redraw.

### 3.5 Server Authority & Drawing Validation
All incoming drawing packets are sanitized and validated against defensive bounds in `server/src/utils/validation.ts`:
- **Identity Enforcement**: `userId` is supplied exclusively by the server (`socket.id`), preventing client spoofing.
- **Stroke ID Validation**: Must be 1–64 alphanumeric characters with hyphens/underscores.
- **Tool Enum Guard**: Strictly restricted to `'pen' | 'highlighter' | 'eraser'`.
- **Numeric & Coordinate Checks**: Coordinates and brush widths must be finite numbers within bounded spatial ranges ($[-100000, 100000]$ and $[0.5, 150]$).
- **Batch Size Limits**: At most 500 points per update; at most 10,000 points per active stroke.
- **Malformed Packet Isolation**: Invalid payloads trigger an `ERROR` event or are dropped safely without server crashes.

### 3.6 Initial State Synchronization (`SYNC_STATE`)
When a new collaborator joins a room that already contains drawings:
1. The server serializes the canonical `room.strokes` array.
2. The server emits `SYNC_STATE` exclusively to the joining socket alongside `ROOM_JOINED`.
3. The new client hydrates its local `strokes` collection and performs a single initial redraw.

### 3.7 Fault Tolerance & Edge Cases
- **Disconnect During Active Stroke**: If a client abruptly disconnects mid-drawing, the server extracts and terminates all in-flight strokes for that socket, broadcasting `DRAW_END` to remaining room members. Remaining clients clean up the abandoned stroke, preventing permanent ghost strokes.
- **Deduplication**: Both server and client check stroke ID existence prior to committing strokes, preventing duplicate entries during network retries.
- **Out-of-Order Handling**: If `DRAW_UPDATE` arrives for an unrecognized or finalized stroke, it is safely ignored without throwing uncaught exceptions.

---

## 4. Live Collaborative Cursors & Presence Architecture (Section 7)

### 4.1 Protocol & Real-Time Flow
Multipayer cursor movement is isolated into dedicated lightweight events:
- **`CURSOR_MOVE` (Client -> Server)**: `{ x: number, y: number }` representing logical canvas CSS coordinates.
- **`CURSOR_UPDATE` (Server -> Room)**: `{ userId: string, x: number, y: number, timestamp: number }`.
- **Zero Echo**: Emitted via `socket.to(roomId).emit(...)`, ensuring the broadcaster never receives an echo of their own cursor.
- **Room Isolation**: Cursors are strictly scoped to the active room namespace; other rooms receive zero cursor traffic.

### 4.2 Throttling & Network Optimization
Direct pointer move events fire at 60–120Hz. To prevent network congestion and serialization overhead:
- **Throttling Interval**: Outgoing cursor coordinates are rate-limited to ~30ms intervals (~30 updates/sec).
- **Movement Threshold Filtering**: Minor sub-pixel vibrations below $1.5\text{px}$ Euclidean distance are dropped if they occur within the throttle window.
- **Immediate Drag Priority**: When active drawing begins, in-flight coordinate updates flush synchronously without delaying stroke creation.

### 4.3 GPU-Composited Decoupled Cursor Layer
Rendering remote cursors on the native HTML5 `<canvas>` would force full canvas redraws or complex dirty-rectangle clears at 30–60Hz, degrading drawing performance. SyncDraw completely decouples cursors:
- **Dedicated DOM Overlay**: `<CursorOverlay>` mounts as an absolute `pointer-events-none` container above the canvas (`z-20`).
- **Direct Style Mutation**: Incoming `CURSOR_UPDATE` events translate existing DOM nodes directly via `el.style.transform = translate3d(x, y, 0)`, bypassing React re-render cycles entirely.
- **Hardware Acceleration**: `transform: translate3d(...)` executes on the GPU compositor thread without triggering browser reflows or repaints.
- **CSS Smoothing**: A subtle `transform 60ms linear` transition provides smooth interpolation between discrete network packets.

### 4.4 Inactivity Staleness & Lifecycle Cleanup
- **Staleness Fading**: After 6 seconds without a `CURSOR_UPDATE`, remote cursor elements fade out (`opacity: 0`) with a smooth CSS ease transition. The collaborator remains active in the room presence list; presence and cursor activity are cleanly decoupled.
- **Disconnect Cleanup**: When `USER_LEFT` is emitted, both the server and remaining clients immediately unmount and garbage-collect the departing user's cursor element and associated timers, preventing phantom/ghost cursors.
- **Unmount Protection**: Room exit and page unmount tear down all active timers and detach DOM nodes.

### 4.5 Presence Badge Polish
- **Color-Coded Initials**: Collaborator avatar circles display the user's uppercase initials rendered against their server-assigned color.
- **Self Indicator**: The local user's avatar displays a bold `(You)` tag and prominent outline.
- **Live Status Pips**: Each avatar badge features a pulsing green online indicator confirming active WebSocket connectivity.

---

## 5. Drawing Operations Architecture (Section 4)

Section 4 established the local drawing environment modeled around reversible operational deltas:

### 5.1 Tools & Rendering
- **Pen**: Solid-color stroke with quadratic Bézier smoothing and round caps/joins.
- **Highlighter**: Semi-transparent stroke rendered with `ctx.globalAlpha = 0.35` and wide presets.
- **Stroke-Level Eraser**: Mathematical point-to-segment Euclidean distance check removes intersected strokes cleanly without raster artifacts.

### 5.2 Reversible Operation Stack (Undo / Redo)
```typescript
type CanvasOperation =
  | { type: 'add-stroke'; stroke: Stroke }
  | { type: 'erase-strokes'; strokes: { stroke: Stroke; index: number }[] }
  | { type: 'clear-canvas'; strokes: Stroke[] };
```
- Operates on discrete reversible deltas, completely avoiding memory-heavy raster snapshots.
- Future-proof: directly matches the payload requirements for Section 6 WebSocket delta broadcasting.

---

## 6. Canvas Rendering Architecture (Section 3)

- Native HTML5 Canvas 2D context.
- High-DPI / Retina resolution scaling (`canvas.width = rect.width * dpr`, `ctx.scale(dpr, dpr)`).
- `ResizeObserver` maintaining stroke integrity and redrawing without loss.
- High-frequency pointer tracking (60–120Hz) managed in `useRef` with incremental segment rendering.

---

## 7. Directory Structure

```text
mindforge/ (SyncDraw Workspace Root)
├── client/
│   ├── src/
│   │   ├── canvas/                     # Local Canvas Engine
│   │   │   ├── export.ts               # Blob-based PNG export utility
│   │   │   ├── geometry.ts             # Segment distance & stroke intersection
│   │   │   ├── history.ts              # Operation application & reversion
│   │   │   ├── pointer.ts              # Unified pointer controller
│   │   │   ├── renderer.ts             # Bézier curve smoothing & tool alpha
│   │   │   ├── scaling.ts              # High-DPI scaling & coordinates
│   │   │   ├── stroke.ts               # Stroke factory
│   │   │   └── types.ts                # Point, Stroke, CanvasOperation types
│   │   ├── collaboration/              # Real-Time Client Abstraction
│   │   │   ├── index.ts                # Module exports
│   │   │   ├── socketClient.ts         # Socket.IO connection & lifecycle client
│   │   │   └── types.ts                # Client collaboration event contracts
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── Canvas.tsx          # Canvas host component
│   │   │   │   ├── ClearConfirmDialog.tsx # Clear confirmation modal
│   │   │   │   └── Toolbar.tsx         # Floating drawing toolbar
│   │   │   ├── collaboration/
│   │   │   │   ├── CursorOverlay.tsx   # GPU-composited remote cursor overlay
│   │   │   │   └── PresenceBadge.tsx   # Live presence roster & color avatars
│   │   │   ├── ui/
│   │   │   │   └── Modal.tsx           # Accessible modal dialog
│   │   │   ├── CreateRoomDialog.tsx    # Room creation modal
│   │   │   ├── FeatureSection.tsx      # Capabilities grid
│   │   │   ├── Header.tsx              # Brand header
│   │   │   ├── Hero.tsx                # Hero section
│   │   │   ├── JoinRoomDialog.tsx      # Room join modal
│   │   │   ├── ProductPreview.tsx      # Static architecture illustration
│   │   │   ├── RoomHeader.tsx          # Room header with presence & status
│   │   │   └── StatusBadge.tsx         # Connection status badge
│   │   ├── pages/
│   │   │   ├── HomePage.tsx            # Landing page
│   │   │   ├── NotFoundPage.tsx        # 404 page
│   │   │   └── RoomPage.tsx            # Room workspace host
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── rooms/
│   │   │   ├── roomManager.ts          # In-memory room registry & cleanup
│   │   │   └── roomState.ts            # Room state container factory
│   │   ├── websocket/
│   │   │   └── socket.ts               # Socket.IO lifecycle & room isolation
│   │   ├── utils/
│   │   │   ├── colors.ts               # Collaborator color assignment
│   │   │   └── validation.ts           # Payload & room ID validation
│   │   ├── types/
│   │   │   ├── collaboration.ts        # Server-authoritative contracts
│   │   │   └── index.ts
│   │   └── server.ts                   # Express + Socket.IO HTTP server
│   ├── test-drawing-sync.mjs           # Automated drawing sync test suite
│   ├── test-cursor-sync.mjs            # Automated live cursor test suite
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── ARCHITECTURE.md
├── package.json
└── README.md
```
