import type { Room, Stroke, OperationRecord } from '../types/collaboration.js';

/**
 * Creates an empty room state container.
 */
export function createRoomState(roomId: string): Room {
  return {
    roomId,
    users: new Map(),
    strokes: [],
    activeStrokes: new Map(),
    operations: [],
    appliedOperationIds: new Set(),
    createdAt: Date.now(),
  };
}

/**
 * Deterministically reconstructs the canonical visible strokes from the chronological operation log.
 */
export function reconstructRoomStrokes(operations: OperationRecord[]): Stroke[] {
  let strokes: Stroke[] = [];
  for (const record of operations) {
    if (!record.active) continue;
    const op = record.operation;
    if (op.type === 'add-stroke') {
      strokes.push(op.stroke);
    } else if (op.type === 'erase-strokes') {
      const idSet = new Set(op.strokeIds);
      strokes = strokes.filter((s) => !idSet.has(s.id));
    } else if (op.type === 'clear-canvas') {
      strokes = [];
    }
  }
  return strokes;
}
