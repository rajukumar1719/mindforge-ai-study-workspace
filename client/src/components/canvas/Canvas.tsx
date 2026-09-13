import React, {
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
  CanvasOperation,
} from '../../canvas';
import {
  setupCanvasResolution,
  createStroke,
  appendPointToStroke,
  renderAllStrokes,
  renderIncrementalSegment,
  attachPointerController,
  doesStrokeIntersectCircle,
} from '../../canvas';

interface CanvasProps {
  userId: string;
  settings: CanvasSettings;
  strokes: Stroke[];
  onOperation: (operation: CanvasOperation) => void;
}

export const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(({
  userId,
  settings,
  strokes,
  onOperation,
}, forwardedRef) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Expose the internal canvas element to parent components (e.g. for PNG export)
  useImperativeHandle(forwardedRef, () => canvasRef.current!);

  // Mutable references for 60fps drawing state to avoid React re-renders during drag
  const activeStrokeRef = useRef<Stroke | null>(null);
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

  // Redraw the entire canvas from logical state
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    renderAllStrokes(ctx, strokesRef.current, width, height);

    // If an active stroke is currently in progress, render it on top
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

  // Redraw when the external canonical strokes array changes (undo, redo, clear)
  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

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
        // Record deleted stroke and original index for undo
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
            erasedInGestureRef.current = [];
          }
          return;
        }

        // Finalize Pen or Highlighter stroke
        const finishedStroke = activeStrokeRef.current;
        if (!finishedStroke) return;

        activeStrokeRef.current = null;
        strokesRef.current = [...strokesRef.current, finishedStroke];

        onOperation({
          type: 'add-stroke',
          stroke: finishedStroke,
        });
      },
    });

    return () => {
      detach();
    };
  }, [userId, processEraserAtPoint, onOperation]);

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
