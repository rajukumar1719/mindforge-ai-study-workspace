import type { Point } from './types';
import { clientToCanvasCoordinates } from './scaling';

export interface PointerControllerCallbacks {
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
  getDimensions: () => { width: number; height: number };
}

/**
 * Attaches unified pointer event handlers (supporting mouse, stylus, and touch)
 * with pointer capture for robust boundary-crossing tracking.
 */
export function attachPointerController(
  canvas: HTMLCanvasElement,
  callbacks: PointerControllerCallbacks
): () => void {
  let isDrawing = false;
  let activePointerId: number | null = null;

  const handlePointerDown = (e: PointerEvent) => {
    // Only primary button or touch/pen touches initiate drawing
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isDrawing = true;
    activePointerId = e.pointerId;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Gracefully ignore if pointer capture fails on certain platforms
    }

    const dims = callbacks.getDimensions();
    const point = clientToCanvasCoordinates(e, canvas, dims.width, dims.height);
    callbacks.onStrokeStart(point);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDrawing || e.pointerId !== activePointerId) return;

    const dims = callbacks.getDimensions();
    const point = clientToCanvasCoordinates(e, canvas, dims.width, dims.height);
    callbacks.onStrokeMove(point);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDrawing || e.pointerId !== activePointerId) return;

    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    isDrawing = false;
    activePointerId = null;
    callbacks.onStrokeEnd();
  };

  const handlePointerCancel = (e: PointerEvent) => {
    if (isDrawing && e.pointerId === activePointerId) {
      isDrawing = false;
      activePointerId = null;
      callbacks.onStrokeEnd();
    }
  };

  const handlePointerLeave = (e: PointerEvent) => {
    // Only terminate if the pointer wasn't captured
    if (isDrawing && !canvas.hasPointerCapture?.(e.pointerId) && e.pointerId === activePointerId) {
      isDrawing = false;
      activePointerId = null;
      callbacks.onStrokeEnd();
    }
  };

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerCancel);
  canvas.addEventListener('pointerleave', handlePointerLeave);

  return () => {
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerCancel);
    canvas.removeEventListener('pointerleave', handlePointerLeave);
  };
}
