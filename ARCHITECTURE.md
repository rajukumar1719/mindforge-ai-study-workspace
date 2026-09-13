# SyncDraw Architecture Document

This document details the architectural foundation, rendering mechanics, and local operation model of **SyncDraw** ("Real-Time Collaborative Drawing Canvas"), covering current structural choices and planned design layers for future development phases.

---

## 1. High-Level System Flow

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
    ▼
Canvas Drawing Engine & Toolset (Active — Sections 3 & 4)
    │
    │  • Native HTML5 Canvas 2D Surface (High-DPI / Retina)
    │  • Tools: Pen, Highlighter (0.35 Alpha), Stroke-Level Eraser
    │  • Logical Reversible Operation Stack (Add, Erase, Clear)
    │  • Bounded Point-to-Segment Geometric Hit Testing
    │  • Blob-Based PNG Export
    │  • Global Shortcut Dispatcher (with Input Guard)
    ▼
Future WebSocket Collaboration Layer (Planned — Section 5+)
    │
    │  • Bidirectional Delta Broadcasting (add-stroke, erase-strokes)
    │  • Live Presence & Multi-User Cursor Coordinates
    │  • Collaborative State Trees & Conflict Resolution
```

---

## 2. Drawing Operations Architecture (Section 4)

Section 4 elevates the canvas engine into an operational drawing environment modeled intentionally around reversible discrete events rather than lossy pixel manipulation.

### 2.1 Tool Representation & Rendering
```typescript
type DrawingTool = 'pen' | 'highlighter' | 'eraser';

interface Stroke {
  id: string;         // Unique collision-resistant UUID (crypto.randomUUID)
  userId: string;     // Creator display name
  tool: DrawingTool;  // 'pen' | 'highlighter' | 'eraser'
  color: string;      // Hex/RGB stroke color
  width: number;      // Stroke width in logical pixels
  points: Point[];    // Chronological array of points
  createdAt: number;  // Epoch timestamp (ms)
}
```

- **Pen**: Standard solid-color stroke rendered using quadratic Bézier smoothing through point midpoints with round caps and joins.
- **Highlighter**: Rendered within the same Bézier curve pipeline with `ctx.save()`, `ctx.globalAlpha = 0.35`, and wider brush presets. Semi-transparency allows background sketches or grid lines to remain readable through highlights.
- **Eraser (Stroke-Level Object Eraser)**:
  Rather than rasterizing white lines (which fails on grid/dark backgrounds and bloats stroke count) or cutting destructive pixel masks via `destination-out` (which prevents granular undo and makes network synchronization extremely heavy), SyncDraw implements a **stroke-level object eraser**.
  - During pointer movement with the eraser active, the engine checks distance from the eraser pointer position `(ex, ey)` with radius `R = width / 2` to every existing stroke.
  - A stroke is considered intersected if the minimum distance from `(ex, ey)` to any segment `[p_i, p_{i+1}]` is `<= R + stroke.width / 2`.
  - Touched strokes are removed from the active collection, stored with their original indices, and committed on `pointerup` as an `erase-strokes` operation.

### 2.2 Logical Operations & Reversible History (Undo / Redo)
SyncDraw models state changes as discrete, reversible operational deltas:

```typescript
type CanvasOperation =
  | { type: 'add-stroke'; stroke: Stroke }
  | { type: 'erase-strokes'; strokes: { stroke: Stroke; index: number }[] }
  | { type: 'clear-canvas'; strokes: Stroke[] };
```

#### Undo / Redo Mechanism:
1. **Adding a Stroke**:
   - `applyOperation`: Appends `stroke` to `strokes`.
   - Appends operation to `undoStack`. Clears `redoStack`.
2. **Erasing Strokes**:
   - `applyOperation`: Filters out strokes whose IDs match the erased items.
   - Appends operation with `{ stroke, index }` to `undoStack`. Clears `redoStack`.
3. **Clearing Canvas**:
   - `applyOperation`: Sets `strokes` to `[]`.
   - Records all cleared strokes in `{ type: 'clear-canvas', strokes }` on `undoStack`.
4. **Executing Undo**:
   - Pops last operation from `undoStack`.
   - Pushes operation to `redoStack`.
   - Calls `revertOperation`:
     - Reverting `add-stroke`: Removes stroke by ID.
     - Reverting `erase-strokes`: Re-inserts each deleted stroke at its original index.
     - Reverting `clear-canvas`: Restores the complete array of cleared strokes!
5. **Executing Redo**:
   - Pops last operation from `redoStack`.
   - Pushes operation to `undoStack`.
   - Calls `applyOperation`.

### 2.3 Intentional Suitability for Future WebSocket Synchronization
This architecture was specifically chosen to prepare for Section 5+ without refactoring:
- **Zero Raster Serialization**: Whiteboards that rely on canvas raster snapshots cannot sync efficiently because sending megabytes of image diffs over WebSockets causes severe network lag and high server memory costs.
- **Compact Delta Messages**:
  - A newly completed stroke is already a clean JSON payload: `broadcast({ type: 'stroke:added', stroke })`.
  - An erase gesture is already an array of IDs: `broadcast({ type: 'strokes:erased', strokeIds })`.
- **Deterministic Replay**: Late-joining clients can be sent the room's serialized stroke log and replay the exact artwork locally in milliseconds.

### 2.4 Blob-Based PNG Export
Exporting uses the native `canvas.toBlob((blob) => { ... }, 'image/png')` API:
- **No UI Bleed**: Export operates directly on the underlying `<canvas>` DOM element via a forwarded React ref, ensuring floating toolbars, room headers, and user dialogs are never captured.
- **Memory Efficiency**: Avoids creating large base64 data URIs that trigger browser garbage collection spikes. Generates a clean object URL and triggers download of `syncdraw-{roomId}.png`.

### 2.5 Keyboard Shortcut Architecture
- A centralized window listener detects single-key tool switches (`P`, `H`, `E`) and modifier combos (`Ctrl+Z`, `Ctrl+Shift+Z`).
- **Focus Safety Guard**: Validates `e.target` to ensure shortcuts are completely disabled when users are typing in text inputs, textareas, or modal fields.

---

## 3. Directory Structure

```text
mindforge/ (SyncDraw Workspace Root)
├── client/
│   ├── src/
│   │   ├── canvas/                     # Standalone Canvas Engine
│   │   │   ├── export.ts               # Blob-based PNG export utility
│   │   │   ├── geometry.ts             # Segment distance & circle-stroke intersection
│   │   │   ├── history.ts              # Logical operation application & reversion
│   │   │   ├── index.ts                # Public canvas module exports
│   │   │   ├── pointer.ts              # Pointer capture & unified event controller
│   │   │   ├── renderer.ts             # Bézier curve smoothing & tool-specific alpha
│   │   │   ├── scaling.ts              # High-DPI resolution & coordinate transformation
│   │   │   ├── stroke.ts               # Stroke factory & point appending helpers
│   │   │   └── types.ts                # Point, Stroke, CanvasOperation, CanvasSettings
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── Canvas.tsx          # Canvas host, stroke-level eraser & ref export
│   │   │   │   ├── ClearConfirmDialog.tsx # Accessible modal for canvas clear confirmation
│   │   │   │   └── Toolbar.tsx         # Floating toolbar with tools, presets, undo/redo
│   │   │   ├── ui/
│   │   │   │   └── Modal.tsx           # Accessible modal dialog
│   │   │   ├── CreateRoomDialog.tsx    # Room creation modal
│   │   │   ├── FeatureSection.tsx      # Core capabilities grid
│   │   │   ├── Header.tsx              # Brand header
│   │   │   ├── Hero.tsx                # Hero section
│   │   │   ├── JoinRoomDialog.tsx      # Room join modal
│   │   │   ├── ProductPreview.tsx      # Static architecture illustration
│   │   │   ├── RoomHeader.tsx          # Room header with link sharing & status
│   │   │   └── StatusBadge.tsx         # Connection status badge
│   │   ├── pages/
│   │   │   ├── HomePage.tsx            # Landing page
│   │   │   ├── NotFoundPage.tsx        # 404 page
│   │   │   └── RoomPage.tsx            # Room workspace host with undo/redo & shortcuts
│   │   ├── types/                      # Client type definitions
│   │   ├── utils/                      # Utilities (roomId, storage, cn)
│   │   ├── App.tsx                     # Route definitions
│   │   ├── index.css                   # Tailwind CSS styling
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
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── ARCHITECTURE.md
├── package.json
└── README.md
```
