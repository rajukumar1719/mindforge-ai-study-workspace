# SyncDraw Architecture Document

This document details the architectural foundation and rendering mechanics of **SyncDraw** ("Real-Time Collaborative Drawing Canvas"), covering current structural choices and planned design layers for future development phases.

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
Canvas Drawing Engine (Active — Section 3)
    │
    │  • Native HTML5 Canvas 2D Surface
    │  • Resolution-Independent Stroke Data Model
    │  • Unified Pointer Events (Mouse / Touch / Stylus)
    │  • Quadratic Bézier Smoothing
    │  • High-DPI / Retina Scaling
    │  • Resize Resilience via ResizeObserver
    ▼
Future WebSocket Collaboration Layer (Planned — Section 4+)
    │
    │  • Bidirectional Delta Broadcasting
    │  • Live Presence & Multi-User Cursor Coordinates
    │  • Conflict Resolution & Synchronized History Stack
```

---

## 2. Canvas Rendering Architecture (Section 3)

The canvas engine is built to deliver smooth 60fps sketching with low latency, high visual fidelity, and clean decoupling from React's component lifecycle.

### 2.1 HTML5 Canvas API vs. SVG Tradeoffs
- **Canvas API (Chosen)**: Direct immediate-mode rasterization using HTML5 2D Context. Unlike retained-mode SVG DOM nodes (which incur heavy layout and tree overhead when handling thousands of path coordinates), HTML5 Canvas handles arbitrary stroke density with consistent frame times.
- **Stroke Data as the Source of Truth**: While the canvas is an immediate-mode surface, all drawing actions are modeled as immutable, structured data objects (`Stroke[]`). This enables complete replayability, serialization, and future network transmission.

### 2.2 Stroke Data Model
```typescript
interface Point {
  x: number;          // Logical CSS X coordinate
  y: number;          // Logical CSS Y coordinate
  pressure?: number;  // Stylus/touch pressure (0.0 to 1.0)
}

interface Stroke {
  id: string;         // Unique collision-resistant UUID (crypto.randomUUID)
  userId: string;     // Creator display name / ID
  tool: 'pen';        // Active drawing tool
  color: string;      // Hex/RGB stroke color
  width: number;      // Logical stroke width in pixels
  points: Point[];    // Chronological array of points
  createdAt: number;  // Epoch timestamp (ms)
}
```

### 2.3 Unified Pointer Event Pipeline
- **Pointer Events**: Employs `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, and `pointerleave` instead of separate mouse and touch implementations, providing unified handling for mouse, touch screens, and active stylus pens.
- **Pointer Capture**: Uses `canvas.setPointerCapture(pointerId)` upon `pointerdown`. This guarantees that strokes continue tracking smoothly even if the user swiftly drags outside the canvas boundary.
- **Gesture Suppression**: Sets `touchAction: 'none'` on the `<canvas>` element to suppress browser pull-to-refresh, pan, and pinch zoom gestures exclusively across the drawing surface without disrupting normal scrolling outside the canvas container.

### 2.4 Coordinate Conversion & High-DPI / Retina Handling
- **Device Pixel Ratio (`dpr`)**:
  ```typescript
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  ctx.scale(dpr, dpr);
  ```
  This ensures 1 logical CSS pixel maps to physical hardware pixels, eliminating blurriness on 4K, MacBook Retina, and mobile screens.
- **Coordinate Normalization**: Logical points are calculated relative to `canvas.getBoundingClientRect()`, accounting for CSS scaling and browser zoom:
  ```typescript
  const rawX = (e.clientX - rect.left) * (logicalWidth / rect.width);
  const rawY = (e.clientY - rect.top) * (logicalHeight / rect.height);
  ```

### 2.5 Quadratic Bézier Curve Smoothing
Rather than rendering crude polyline segments between raw sampled points (which appear jagged), the renderer computes midpoints between successive points and draws smooth quadratic curves:
```typescript
ctx.beginPath();
ctx.moveTo(points[0].x, points[0].y);

for (let i = 1; i < points.length - 1; i++) {
  const current = points[i];
  const next = points[i + 1];
  const midX = (current.x + next.x) / 2;
  const midY = (current.y + next.y) / 2;
  ctx.quadraticCurveTo(current.x, current.y, midX, midY);
}

ctx.lineTo(last.x, last.y);
ctx.stroke();
```
Single-point taps render as round dots (`ctx.arc`).

### 2.6 Resize Strategy
- **ResizeObserver**: Observes the canvas parent container element.
- **Preserved Geometry**: Upon resize, physical canvas dimensions are updated and `ctx.scale(dpr, dpr)` is reapplied.
- **Non-Destructive Redraw**: Because all strokes are preserved as resolution-independent logical vectors in `strokesRef`, `renderAllStrokes(ctx, strokes, width, height)` immediately restores the entire artwork with zero loss of quality or stroke truncation.

### 2.7 Performance & React Decoupling
- High-frequency pointer events (`pointermove`) run at 60–120Hz. To avoid React state thrashing, active strokes are accumulated in `useRef` instances and rendered incrementally via direct 2D context drawing (`renderIncrementalSegment`).
- React state (`setStrokes`) is updated only when a stroke is finalized on `pointerup`, ensuring the UI thread remains responsive and stutter-free.

---

## 3. Directory Structure

```text
mindforge/ (SyncDraw Workspace Root)
├── client/
│   ├── src/
│   │   ├── canvas/                     # Standalone Canvas Engine
│   │   │   ├── index.ts                # Public canvas module exports
│   │   │   ├── pointer.ts              # Pointer capture & unified event controller
│   │   │   ├── renderer.ts             # Bézier curve smoothing & redraw routines
│   │   │   ├── scaling.ts              # High-DPI resolution & coordinate transformation
│   │   │   ├── stroke.ts               # Stroke factory & immutability helpers
│   │   │   └── types.ts                # Point, Stroke, and CanvasSettings types
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── Canvas.tsx          # React Canvas host & ResizeObserver
│   │   │   │   └── Toolbar.tsx         # Floating pen, palette, and brush size controls
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
│   │   │   └── RoomPage.tsx            # Room workspace host
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
