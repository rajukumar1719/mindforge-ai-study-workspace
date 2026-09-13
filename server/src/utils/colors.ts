import type { Collaborator } from '../types/collaboration.js';

export const COLLABORATOR_PALETTE = [
  '#4f46e5', // Indigo
  '#059669', // Emerald
  '#d97706', // Amber
  '#e11d48', // Rose
  '#7c3aed', // Violet
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#2563eb', // Blue
  '#16a34a', // Green
  '#db2777', // Pink
];

/**
 * Selects an assigned color for a new collaborator, preferring unused colors in the room.
 */
export function assignCollaboratorColor(existingUsers: Iterable<Collaborator>): string {
  const usedColorCounts = new Map<string, number>();

  for (const color of COLLABORATOR_PALETTE) {
    usedColorCounts.set(color, 0);
  }

  for (const user of existingUsers) {
    const count = usedColorCounts.get(user.color) || 0;
    usedColorCounts.set(user.color, count + 1);
  }

  // Find the color with the minimum usage count
  let bestColor = COLLABORATOR_PALETTE[0]!;
  let minCount = Infinity;

  for (const color of COLLABORATOR_PALETTE) {
    const count = usedColorCounts.get(color) ?? 0;
    if (count < minCount) {
      minCount = count;
      bestColor = color;
      if (minCount === 0) break; // First completely unused color found
    }
  }

  return bestColor;
}
