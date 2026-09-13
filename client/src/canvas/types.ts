/**
 * Core Canvas Engine Type Definitions
 * Designed for immediate local drawing and future WebSocket delta synchronization.
 */

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type DrawingTool = 'pen';

export interface Stroke {
  id: string;
  userId: string;
  tool: DrawingTool;
  color: string;
  width: number;
  points: Point[];
  createdAt: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  dpr: number;
}

export interface CanvasSettings {
  tool: DrawingTool;
  color: string;
  width: number;
}

export type StrokeListener = (stroke: Stroke) => void;
