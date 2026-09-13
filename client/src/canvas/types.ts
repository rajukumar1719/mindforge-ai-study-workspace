/**
 * Core Canvas Engine Type Definitions
 * Designed for immediate local drawing and future WebSocket delta synchronization.
 */

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type DrawingTool = 'pen' | 'highlighter' | 'eraser';

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

export const TOOL_DEFAULT_WIDTHS: Record<DrawingTool, number> = {
  pen: 4,
  highlighter: 16,
  eraser: 20,
};

// Logical Reversible Operations for Undo / Redo
export interface AddStrokeOperation {
  type: 'add-stroke';
  stroke: Stroke;
}

export interface EraseStrokesOperation {
  type: 'erase-strokes';
  strokes: { stroke: Stroke; index: number }[];
}

export interface ClearCanvasOperation {
  type: 'clear-canvas';
  strokes: Stroke[];
}

export type CanvasOperation =
  | AddStrokeOperation
  | EraseStrokesOperation
  | ClearCanvasOperation;

export type StrokeListener = (stroke: Stroke) => void;
