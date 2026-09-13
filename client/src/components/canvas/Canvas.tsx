import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Stroke, CanvasSettings, Point } from '../../canvas';
import {
  setupCanvasResolution,
  createStroke,
  appendPointToStroke,
  renderAllStrokes,
  renderIncrementalSegment,
  attachPointerController,
} from '../../canvas';

interface CanvasProps {
  userId: string;
  settings: CanvasSettings;
  strokes: Stroke[];
  onStrokeComplete: (stroke: Stroke) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  userId,
  settings,
  strokes,
  onStrokeComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for high-frequency mutable drawing state to avoid React re-renders during active draw
  const activeStrokeRef = useRef<Stroke | null>(null);
  const strokesRef = useRef<Stroke[]>(strokes);
  const settingsRef = useRef<CanvasSettings>(settings);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [isDrawing, setIsDrawing] = useState(false);

  // Keep refs synchronized with props
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Full canvas redraw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    renderAllStrokes(ctx, strokesRef.current, width, height);

    // If a stroke is actively being drawn, also render it
    if (activeStrokeRef.current) {
      const active = activeStrokeRef.current;
      renderIncrementalSegment(ctx, active.points, active.color, active.width);
    }
  }, []);

  // Redraw when strokes collection updates from external props
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
      // Debounce slight layout thrashing
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(handleResize);
    });

    resizeObserver.observe(container);
    handleResize(); // Initial measurement

    return () => {
      resizeObserver.disconnect();
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
    };
  }, [redraw]);

  // Attach pointer controller for local drawing flow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const detach = attachPointerController(canvas, {
      getDimensions: () => dimensionsRef.current,

      onStrokeStart: (point: Point) => {
        setIsDrawing(true);
        const currentSettings = settingsRef.current;

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
          // Render immediate single point dot
          ctx.save();
          ctx.fillStyle = newStroke.color;
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(0.5, newStroke.width / 2), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      },

      onStrokeMove: (point: Point) => {
        if (!activeStrokeRef.current) return;

        const updated = appendPointToStroke(activeStrokeRef.current, point);
        activeStrokeRef.current = updated;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderIncrementalSegment(ctx, updated.points, updated.color, updated.width);
        }
      },

      onStrokeEnd: () => {
        const finishedStroke = activeStrokeRef.current;
        if (!finishedStroke) return;

        activeStrokeRef.current = null;
        setIsDrawing(false);

        // Commit to local strokes and notify parent
        strokesRef.current = [...strokesRef.current, finishedStroke];
        onStrokeComplete(finishedStroke);
      },
    });

    return () => {
      detach();
    };
  }, [userId, onStrokeComplete]);

  const isEmpty = strokes.length === 0 && !isDrawing;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden select-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] bg-slate-50"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Collaborative drawing canvas. Draw freely with mouse, stylus, or touch."
        tabIndex={0}
        style={{ touchAction: 'none' }}
        className="block w-full h-full cursor-crosshair focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />

      {/* Subtle non-intrusive empty canvas hint */}
      {isEmpty && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-slate-200/80 shadow-xs text-xs font-medium text-slate-400 backdrop-blur-xs">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Start drawing anywhere with mouse, stylus, or touch</span>
          </div>
        </div>
      )}
    </div>
  );
};
