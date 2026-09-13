/**
 * Room ID Generator and Validation Utilities.
 * Uses an unambiguous character set (excluding 0/O, 1/I) for human readability and sharing.
 */

const ROOM_ID_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_ROOM_ID_LENGTH = 6;

/**
 * Generates a unique, URL-safe, human-readable room ID (e.g., "ABC7KQ").
 */
export function generateRoomId(length: number = DEFAULT_ROOM_ID_LENGTH): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ROOM_ID_CHARSET.length);
    result += ROOM_ID_CHARSET[randomIndex];
  }
  return result;
}

/**
 * Normalizes user-entered room ID by trimming whitespace and capitalizing.
 */
export function normalizeRoomId(rawId: string): string {
  return rawId.trim().toUpperCase();
}

/**
 * Validates that a room ID is non-empty, within reasonable length bounds,
 * and contains only URL-safe alphanumeric characters, dashes, or underscores.
 */
export function isValidRoomId(rawId: string): boolean {
  const normalized = normalizeRoomId(rawId);
  if (normalized.length < 3 || normalized.length > 24) {
    return false;
  }
  // URL-safe characters: uppercase/lowercase letters, digits, hyphen, underscore
  return /^[A-Z0-9_-]+$/.test(normalized);
}
