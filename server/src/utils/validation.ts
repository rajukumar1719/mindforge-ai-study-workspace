import type { JoinRoomPayload } from '../types/collaboration.js';

/**
 * Validates that a room ID is a non-empty, URL-safe string within reasonable length bounds (3-24 chars).
 */
export function isValidRoomId(roomId: unknown): roomId is string {
  if (typeof roomId !== 'string') return false;
  const normalized = roomId.trim().toUpperCase();
  if (normalized.length < 3 || normalized.length > 24) return false;
  return /^[A-Z0-9_-]+$/.test(normalized);
}

/**
 * Validates that a user display name is trimmed, non-empty, and within 2-30 characters.
 */
export function isValidDisplayName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 30;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Validates the runtime shape of the JOIN_ROOM payload safely without blind casting.
 */
export function validateJoinRoomPayload(payload: unknown): ValidationResult<JoinRoomPayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Payload must be a JSON object.',
      },
    };
  }

  const raw = payload as Record<string, unknown>;

  if (!isValidRoomId(raw['roomId'])) {
    return {
      valid: false,
      error: {
        code: 'INVALID_ROOM_ID',
        message: 'Room ID must be 3–24 alphanumeric characters.',
      },
    };
  }

  if (!isValidDisplayName(raw['displayName'])) {
    return {
      valid: false,
      error: {
        code: 'INVALID_DISPLAY_NAME',
        message: 'Display name must be between 2 and 30 characters.',
      },
    };
  }

  return {
    valid: true,
    data: {
      roomId: (raw['roomId'] as string).trim().toUpperCase(),
      displayName: (raw['displayName'] as string).trim(),
    },
  };
}
