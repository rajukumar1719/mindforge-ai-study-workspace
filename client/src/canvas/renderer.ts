import type { Stroke, Point } from './types';

/**
 * Clears the canvas drawing surface across logical bounds.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number
): void {
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);
}

/**
 * Renders a single stroke onto the 2D canvas context using quadratic Bézier curve smoothing.
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke
): void {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Case 1: Single point (tap/dot) -> Render filled circle
  if (points.length === 1) {
    const pt = points[0]!;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(0.5, stroke.width / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Case 2: Two points -> Direct line segment
  if (points.length === 2) {
    const p0 = points[0]!;
    const p1 = points[1]!;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Case 3: 3+ points -> Smooth quadratic Bézier curve through midpoints
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  // Connect to the final point
  const last = points[points.length - 1]!;
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Redraws the entire collection of finalized strokes.
 */
export function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  logicalWidth: number,
  logicalHeight: number
): void {
  clearCanvas(ctx, logicalWidth, logicalHeight);
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i];
    if (s) {
      renderStroke(ctx, s);
    }
  }
}

/**
 * Incrementally renders the latest segment of an active stroke for immediate 60fps feedback.
 */
export function renderIncrementalSegment(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number
): void {
  const len = points.length;
  if (len < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (len === 2) {
    const p0 = points[0]!;
    const p1 = points[1]!;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  } else {
    // Render the smooth curve between the last midpoints
    const pPrev = points[len - 3]!;
    const pCurr = points[len - 2]!;
    const pNext = points[len - 1]!;

    const midPrevX = (pPrev.x + pCurr.x) / 2;
    const midPrevY = (pPrev.y + pCurr.y) / 2;

    const midNextX = (pCurr.x + pNext.x) / 2;
    const midNextY = (pCurr.y + pNext.y) / 2;

    ctx.beginPath();
    ctx.moveTo(midPrevX, midPrevY);
    ctx.quadraticCurveTo(pCurr.x, pCurr.y, midNextX, midNextY);
    ctx.stroke();
  }

  ctx.restore();
}
