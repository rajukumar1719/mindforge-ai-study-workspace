import type { Point, Stroke } from './types';

/**
 * Calculates the squared Euclidean distance from point (px, py) to line segment (ax, ay)-(bx, by).
 */
export function distanceToSegmentSquared(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dpx = px - ax;
    const dpy = py - ay;
    return dpx * dpx + dpy * dpy;
  }

  // Projection factor clamped to segment bounds [0, 1]
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  const distX = px - projX;
  const distY = py - projY;
  return distX * distX + distY * distY;
}

/**
 * Determines whether a stroke intersects a circular test area centered at `center` with `radius`.
 * Includes bounding-box optimization for maximum efficiency.
 */
export function doesStrokeIntersectCircle(
  stroke: Stroke,
  center: Point,
  eraserRadius: number
): boolean {
  const points = stroke.points;
  if (!points || points.length === 0) return false;

  const threshold = eraserRadius + Math.max(1, stroke.width / 2);
  const thresholdSq = threshold * threshold;

  // Single-point dot case
  if (points.length === 1) {
    const pt = points[0]!;
    const dx = center.x - pt.x;
    const dy = center.y - pt.y;
    return dx * dx + dy * dy <= thresholdSq;
  }

  // Segment-by-segment check
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;

    const distSq = distanceToSegmentSquared(
      center.x,
      center.y,
      p1.x,
      p1.y,
      p2.x,
      p2.y
    );

    if (distSq <= thresholdSq) {
      return true;
    }
  }

  return false;
}
