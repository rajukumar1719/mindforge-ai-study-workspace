import type { CanvasDimensions, Point } from './types';

/**
 * Configures the HTML5 canvas resolution to match the physical device pixel ratio (Retina/High-DPI).
 *
 * NOTE ON COORDINATE SYSTEMS:
 * - Physical dimensions (canvas.width, canvas.height) are multiplied by `dpr` so individual canvas pixels
 *   match physical device hardware pixels, eliminating blurriness.
 * - CSS dimensions (style.width, style.height) are set to logical container dimensions.
 * - `ctx.scale(dpr, dpr)` maps all 2D context drawing commands to the logical CSS coordinate system.
 * - All stored stroke points remain in logical coordinates (CSS pixels), rendering them completely
 *   resolution-independent.
 */
export function setupCanvasResolution(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number
): CanvasDimensions {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const physicalWidth = Math.round(logicalWidth * dpr);
  const physicalHeight = Math.round(logicalHeight * dpr);

  canvas.width = physicalWidth;
  canvas.height = physicalHeight;
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Reset any prior transform before applying the device scale factor
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  return {
    width: logicalWidth,
    height: logicalHeight,
    dpr,
  };
}

/**
 * Translates pointer events (clientX/clientY) into logical canvas coordinates.
 * Accounts for canvas bounding rectangle position, CSS scaling, and browser zoom.
 */
export function clientToCanvasCoordinates(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number
): Point {
  const rect = canvas.getBoundingClientRect();

  // Avoid division by zero if canvas is hidden or collapsed
  const scaleX = rect.width > 0 ? logicalWidth / rect.width : 1;
  const scaleY = rect.height > 0 ? logicalHeight / rect.height : 1;

  const rawX = (e.clientX - rect.left) * scaleX;
  const rawY = (e.clientY - rect.top) * scaleY;

  return {
    x: Math.round(rawX * 10) / 10,
    y: Math.round(rawY * 10) / 10,
    pressure: e.pressure > 0 ? e.pressure : undefined,
  };
}
