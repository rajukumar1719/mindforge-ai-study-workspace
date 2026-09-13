import type { Stroke, Point, DrawingTool } from './types';

/**
 * Generates a unique, collision-resistant stroke ID for local creation and future network synchronization.
 */
export function generateStrokeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `strk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Factory to create a new stroke object.
 */
export function createStroke(
  userId: string,
  tool: DrawingTool,
  color: string,
  width: number,
  initialPoint: Point
): Stroke {
  return {
    id: generateStrokeId(),
    userId,
    tool,
    color,
    width,
    points: [initialPoint],
    createdAt: Date.now(),
  };
}

/**
 * Appends a point to an existing stroke (immutable copy).
 */
export function appendPointToStroke(stroke: Stroke, point: Point): Stroke {
  return {
    ...stroke,
    points: [...stroke.points, point],
  };
}
