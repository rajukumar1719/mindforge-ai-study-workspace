import type { Stroke, CanvasOperation } from './types';

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
