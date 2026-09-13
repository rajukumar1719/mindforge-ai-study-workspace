import type { Room, Collaborator } from '../types/collaboration.js';
import { createRoomState } from './roomState.js';

/**
 * In-Memory Room Manager
 * Authoritative registry managing active rooms, collaborator presence, and memory release.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public createRoom(roomId: string): Room {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const newRoom = createRoomState(roomId);
    this.rooms.set(roomId, newRoom);
    console.log(`[RoomManager] Room created: ${roomId} (Total active rooms: ${this.rooms.size})`);
    return newRoom;
  }

  public getOrCreateRoom(roomId: string): Room {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;
    return this.createRoom(roomId);
  }

  public addUser(roomId: string, user: Collaborator): void {
    const room = this.getOrCreateRoom(roomId);
    room.users.set(user.id, user);
  }

  public removeUser(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const removed = room.users.delete(userId);
    if (removed) {
      this.deleteRoomIfEmpty(roomId);
    }
    return removed;
  }

  public getUsers(roomId: string): Collaborator[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  public deleteRoomIfEmpty(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room cleaned up: ${roomId} (Remaining active rooms: ${this.rooms.size})`);
      return true;
    }

    return false;
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }
}

export const roomManager = new RoomManager();
