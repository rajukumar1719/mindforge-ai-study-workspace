import type { Room } from '../types/collaboration.js';

/**
 * Creates an empty room state container.
 */
export function createRoomState(roomId: string): Room {
  return {
    roomId,
    users: new Map(),
    createdAt: Date.now(),
  };
}
