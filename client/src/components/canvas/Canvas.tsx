import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type {
  Stroke,
  CanvasSettings,
  Point,
  DrawingTool,
  CanvasOperation,
} from '../../canvas';
import {
  setupCanvasResolution,
  createStroke,
  appendPointToStroke,
  renderStroke,
  renderAllStrokes,
  renderIncrementalSegment,
  attachPointerController,
  doesStrokeIntersectCircle,
} from '../../canvas';
import type {
  DrawStartData,
  DrawUpdateData,
  DrawEndData,
} from '../../collaboration/types';

export interface CanvasRef {
  getCanvasElement: () => HTMLCanvasElement | null;
  handleRemoteDrawStart: (data: DrawStartData) => void;
  handleRemoteDrawUpdate: (data: DrawUpdateData) => void;
  handleRemoteDrawEnd: (data: DrawEndData) => void;
  cleanRemoteStrokesForUser: (userId: string) => void;
}

interface CanvasProps {
  userId: string;
  settings: CanvasSettings;
  strokes: Stroke[];
  onOperation: (operation: CanvasOperation) => void;
  onRemoteStrokeComplete?: (stroke: Stroke) => void;
  onLocalDrawStart?: (data: {
    strokeId: string;
    tool: DrawingTool;
    color: string;
    width: number;
    point: Point;
  }) => void;
  onLocalDrawMove?: (strokeId: string, point: Point) => void;
  onLocalDrawEnd?: (strokeId: string) => void;
  onLocalErase?: (strokeIds: string[]) => void;
  onLocalCursorMove?: (point: Point) => void;
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(({
  userId,
  settings,
  strokes,
  onOperation,
  onRemoteStrokeComplete,
  onLocalDrawStart,
  onLocalDrawMove,
  onLocalDrawEnd,
  onLocalErase,
  onLocalCursorMove,
}, forwardedRef) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mutable references for 60fps local and remote drawing state
  const activeStrokeRef = useRef<Stroke | null>(null);
  const remoteActiveStrokesRef = useRef<Map<string, Stroke>>(new Map());
  const strokesRef = useRef<Stroke[]>(strokes);
  const settingsRef = useRef<CanvasSettings>(settings);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Tracks strokes deleted in the current continuous eraser drag
  const erasedInGestureRef = useRef<{ stroke: Stroke; index: number }[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);

  // Synchronize ref mirrors with props
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Redraw the entire canvas from canonical strokes + active in-flight strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    renderAllStrokes(ctx, strokesRef.current, width, height);

    // Render active remote strokes in progress
    for (const remoteStroke of remoteActiveStrokesRef.current.values()) {
      renderStroke(ctx, remoteStroke);
    }

    // If an active local stroke is currently in progress, render it on top
    if (activeStrokeRef.current) {
      const active = activeStrokeRef.current;
      renderIncrementalSegment(
        ctx,
        active.points,
        active.color,
        active.width,
        active.tool
      );
    }
  }, []);

  // Redraw when the external canonical strokes array changes
  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  // Expose imperative methods to parent for high-frequency remote socket events and PNG export
  useImperativeHandle(forwardedRef, () => ({
    getCanvasElement: () => canvasRef.current,

    handleRemoteDrawStart: (data: DrawStartData) => {
      // Deduplicate: ignore if already in canonical strokes or already tracked
      if (strokesRef.current.some((s) => s.id === data.strokeId)) return;
      if (remoteActiveStrokesRef.current.has(data.strokeId)) return;

      const remoteStroke: Stroke = {
        id: data.strokeId,
        userId: data.userId,
        tool: data.tool,
        color: data.color,
        width: data.width,
        points: [data.point],
        createdAt: Date.now(),
      };

      remoteActiveStrokesRef.current.set(data.strokeId, remoteStroke);

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.save();
        if (remoteStroke.tool === 'highlighter') {
          ctx.globalAlpha = 0.35;
        }
        ctx.fillStyle = remoteStroke.color;
        ctx.beginPath();
        ctx.arc(data.point.x, data.point.y, Math.max(0.5, remoteStroke.width / 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },

    handleRemoteDrawUpdate: (data: DrawUpdateData) => {
      const remoteStroke = remoteActiveStrokesRef.current.get(data.strokeId);
      if (!remoteStroke) return; // Gracefully drop if DRAW_START arrived late or missing

      const ctx = canvasRef.current?.getContext('2d');
      for (const pt of data.points) {
        remoteStroke.points.push(pt);
      }

      if (ctx) {
        renderIncrementalSegment(
          ctx,
          remoteStroke.points,
          remoteStroke.color,
          remoteStroke.width,
          remoteStroke.tool
        );
      }
    },

    handleRemoteDrawEnd: (data: DrawEndData) => {
      const remoteStroke = remoteActiveStrokesRef.current.get(data.strokeId);
      if (!remoteStroke) return;

      remoteActiveStrokesRef.current.delete(data.strokeId);

      // Check deduplication before committing to canonical strokes
      if (!strokesRef.current.some((s) => s.id === remoteStroke.id)) {
        strokesRef.current = [...strokesRef.current, remoteStroke];
        onRemoteStrokeComplete?.(remoteStroke);
      }
    },

    cleanRemoteStrokesForUser: (abandonedUserId: string) => {
      let cleaned = false;
      for (const [strokeId, stroke] of remoteActiveStrokesRef.current.entries()) {
        if (stroke.userId === abandonedUserId) {
          remoteActiveStrokesRef.current.delete(strokeId);
          cleaned = true;
        }
      }
      if (cleaned) {
        redraw();
      }
    },
  }), [redraw, onRemoteStrokeComplete]);

  // ResizeObserver setup for high-DPI scaling and resize resilience
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let resizeTimer: number | null = null;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const logicalWidth = Math.floor(rect.width);
      const logicalHeight = Math.floor(rect.height);

      if (logicalWidth <= 0 || logicalHeight <= 0) return;

      dimensionsRef.current = { width: logicalWidth, height: logicalHeight };
      setupCanvasResolution(canvas, logicalWidth, logicalHeight);
      redraw();
    };

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(handleResize);
    });

    resizeObserver.observe(container);
    handleResize();

    return () => {
      resizeObserver.disconnect();
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
    };
  }, [redraw]);

  // Helper for eraser hit-testing
  const processEraserAtPoint = useCallback((point: Point) => {
    const currentSettings = settingsRef.current;
    const eraserRadius = Math.max(4, currentSettings.width / 2);
    const currentStrokes = strokesRef.current;
    let hitDetected = false;

    const remainingStrokes: Stroke[] = [];

    for (let i = 0; i < currentStrokes.length; i++) {
      const s = currentStrokes[i]!;
      if (doesStrokeIntersectCircle(s, point, eraserRadius)) {
        hitDetected = true;
        erasedInGestureRef.current.push({ stroke: s, index: i });
      } else {
        remainingStrokes.push(s);
      }
    }

    if (hitDetected) {
      strokesRef.current = remainingStrokes;
      redraw();
    }
  }, [redraw]);

  // Attach pointer controller for drawing and erasing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const detach = attachPointerController(canvas, {
      getDimensions: () => dimensionsRef.current,

      onCursorMove: (point: Point) => {
        onLocalCursorMove?.(point);
      },

      onStrokeStart: (point: Point) => {
        setIsDrawing(true);
        const currentSettings = settingsRef.current;

        if (currentSettings.tool === 'eraser') {
          erasedInGestureRef.current = [];
          processEraserAtPoint(point);
          return;
        }

        // Pen or Highlighter
        const newStroke = createStroke(
          userId,
          currentSettings.tool,
          currentSettings.color,
          currentSettings.width,
          point
        );

        activeStrokeRef.current = newStroke;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          if (newStroke.tool === 'highlighter') {
            ctx.globalAlpha = 0.35;
          }
          ctx.fillStyle = newStroke.color;
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(0.5, newStroke.width / 2), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Emit DRAW_START to room peers
        onLocalDrawStart?.({
          strokeId: newStroke.id,
          tool: newStroke.tool,
          color: newStroke.color,
          width: newStroke.width,
          point,
        });
      },

      onStrokeMove: (point: Point) => {
        const currentSettings = settingsRef.current;

        if (currentSettings.tool === 'eraser') {
          processEraserAtPoint(point);
          return;
        }

        if (!activeStrokeRef.current) return;

        const updated = appendPointToStroke(activeStrokeRef.current, point);
        activeStrokeRef.current = updated;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderIncrementalSegment(
            ctx,
            updated.points,
            updated.color,
            updated.width,
            updated.tool
          );
        }

        // Queue point for batched network dispatch
        onLocalDrawMove?.(updated.id, point);
      },

      onStrokeEnd: () => {
        const currentSettings = settingsRef.current;
        setIsDrawing(false);

        if (currentSettings.tool === 'eraser') {
          const erased = erasedInGestureRef.current;
          if (erased.length > 0) {
            onOperation({
              type: 'erase-strokes',
              strokes: [...erased],
            });
            onLocalErase?.(erased.map((e) => e.stroke.id));
            erasedInGestureRef.current = [];
          }
          return;
        }

        // Finalize Pen or Highlighter stroke
        const finishedStroke = activeStrokeRef.current;
        if (!finishedStroke) return;

        activeStrokeRef.current = null;
        strokesRef.current = [...strokesRef.current, finishedStroke];

        // Notify socket client to flush pending batch and emit DRAW_END
        onLocalDrawEnd?.(finishedStroke.id);

        onOperation({
          type: 'add-stroke',
          stroke: finishedStroke,
        });
      },
    });

    return () => {
      detach();
    };
  }, [
    userId,
    processEraserAtPoint,
    onOperation,
    onLocalDrawStart,
    onLocalDrawMove,
    onLocalDrawEnd,
    onLocalErase,
    onLocalCursorMove,
  ]);

  const isEmpty = strokes.length === 0 && !isDrawing;
  const isEraserActive = settings.tool === 'eraser';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden select-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] bg-slate-50"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Collaborative drawing canvas surface. Draw or erase freely with mouse, stylus, or touch."
        tabIndex={0}
        style={{ touchAction: 'none' }}
        className={`block w-full h-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
          isEraserActive ? 'cursor-cell' : 'cursor-crosshair'
        }`}
      />

      {/* Subtle non-intrusive empty canvas hint */}
      {isEmpty && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-slate-200/80 shadow-xs text-xs font-medium text-slate-400 backdrop-blur-xs">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Start drawing anywhere with pen, highlighter, or touch</span>
          </div>
        </div>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';
