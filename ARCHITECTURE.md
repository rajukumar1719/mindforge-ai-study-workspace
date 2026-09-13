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
> **Section 5 Scope Notice**: The real-time infrastructure currently synchronizes room connection lifecycles, authoritative collaborator presence, and room membership. **Drawing stroke synchronization (`DRAW_START`, `DRAW_UPDATE`, `DRAW_END`) and live cursors are intentionally scheduled for Section 6**.

---

## 2. Real-Time Architecture (Section 5)

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

## 3. Drawing Operations Architecture (Section 4)

Section 4 established the local drawing environment modeled around reversible operational deltas:

### 3.1 Tools & Rendering
- **Pen**: Solid-color stroke with quadratic Bézier smoothing and round caps/joins.
- **Highlighter**: Semi-transparent stroke rendered with `ctx.globalAlpha = 0.35` and wide presets.
- **Stroke-Level Eraser**: Mathematical point-to-segment Euclidean distance check removes intersected strokes cleanly without raster artifacts.

### 3.2 Reversible Operation Stack (Undo / Redo)
```typescript
type CanvasOperation =
  | { type: 'add-stroke'; stroke: Stroke }
  | { type: 'erase-strokes'; strokes: { stroke: Stroke; index: number }[] }
  | { type: 'clear-canvas'; strokes: Stroke[] };
```
- Operates on discrete reversible deltas, completely avoiding memory-heavy raster snapshots.
- Future-proof: directly matches the payload requirements for Section 6 WebSocket delta broadcasting.

---

## 4. Canvas Rendering Architecture (Section 3)

- Native HTML5 Canvas 2D context.
- High-DPI / Retina resolution scaling (`canvas.width = rect.width * dpr`, `ctx.scale(dpr, dpr)`).
- `ResizeObserver` maintaining stroke integrity and redrawing without loss.
- High-frequency pointer tracking (60–120Hz) managed in `useRef` with incremental segment rendering.

---

## 5. Directory Structure

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
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── ARCHITECTURE.md
├── package.json
└── README.md
```
