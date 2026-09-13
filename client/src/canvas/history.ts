import type { Stroke, CanvasOperation } from './types';
import type { CollaborativeOperation, OperationRecord } from '../collaboration/types';

/**
 * Applies a logical canvas operation to a collection of strokes, returning the updated array.
 */
export function applyOperation(
  strokes: Stroke[],
  operation: CanvasOperation
): Stroke[] {
  switch (operation.type) {
    case 'add-stroke': {
      return [...strokes, operation.stroke];
    }

    case 'erase-strokes': {
      const idsToRemove = new Set(operation.strokes.map((s) => s.stroke.id));
      return strokes.filter((s) => !idsToRemove.has(s.id));
    }

    case 'clear-canvas': {
      return [];
    }

    default:
      return strokes;
  }
}

/**
 * Reverts a logical canvas operation, restoring the previous stroke state.
 */
export function revertOperation(
  strokes: Stroke[],
  operation: CanvasOperation
): Stroke[] {
  switch (operation.type) {
    case 'add-stroke': {
      // Revert add: remove the added stroke
      return strokes.filter((s) => s.id !== operation.stroke.id);
    }

    case 'erase-strokes': {
      // Revert erase: re-insert deleted strokes at their original indices
      const restored = [...strokes];
      // Sort in ascending index order to insert cleanly
      const sorted = [...operation.strokes].sort((a, b) => a.index - b.index);

      for (const item of sorted) {
        if (item.index >= 0 && item.index <= restored.length) {
          restored.splice(item.index, 0, item.stroke);
        } else {
          restored.push(item.stroke);
        }
      }

      return restored;
    }

    case 'clear-canvas': {
      // Revert clear: restore all cleared strokes
      return [...operation.strokes];
    }

    default:
      return strokes;
  }
}

/**
 * Deterministically reconstructs the canonical visible strokes from the chronological operation log.
 */
export function reconstructCanvasState(operations: OperationRecord[]): Stroke[] {
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

/**
 * Creates an indexed Map of operation records keyed by operationId for O(1) lookups.
 */
export function createOperationIndex(
  operations: OperationRecord[]
): Map<string, OperationRecord> {
  const map = new Map<string, OperationRecord>();
  for (const record of operations) {
    map.set(record.operation.operationId, record);
  }
  return map;
}

/**
 * Finds the latest undoable base operation authored by the specified user.
 * Scans backwards from the most recent operation.
 */
export function findLatestUndoableOperation(
  operations: OperationRecord[],
  userId: string
): CollaborativeOperation | null {
  for (let i = operations.length - 1; i >= 0; i--) {
    const record = operations[i]!;
    if (
      record.active &&
      record.operation.userId === userId &&
      (record.operation.type === 'add-stroke' ||
        record.operation.type === 'erase-strokes' ||
        record.operation.type === 'clear-canvas')
    ) {
      return record.operation;
    }
  }
  return null;
}

/**
 * Finds the latest redoable base operation authored by the specified user.
 * Scans backwards for the most recent undo operation by this user whose target is currently inactive.
 * Accepts an optional pre-computed Map index for O(1) target lookups (avoiding nested O(N^2) searches).
 */
export function findLatestRedoableOperation(
  operations: OperationRecord[],
  userId: string,
  operationIndex?: Map<string, OperationRecord>
): CollaborativeOperation | null {
  // If no pre-computed index provided, create one for O(1) target lookups
  const index = operationIndex || createOperationIndex(operations);

  for (let i = operations.length - 1; i >= 0; i--) {
    const record = operations[i]!;
    if (record.operation.type === 'undo' && record.operation.userId === userId) {
      const targetId = record.operation.targetOperationId;
      const targetRecord = index.get(targetId);
      if (targetRecord && !targetRecord.active && targetRecord.operation.userId === userId) {
        return targetRecord.operation;
      }
    }
  }
  return null;
}

