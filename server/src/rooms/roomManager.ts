import type { Room, Collaborator, Stroke, Point } from '../types/collaboration.js';
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

  // Drawing State Management
  public startStroke(roomId: string, stroke: Stroke): void {
    const room = this.getOrCreateRoom(roomId);
    room.activeStrokes.set(stroke.id, stroke);
  }

  public appendStrokePoints(roomId: string, strokeId: string, points: Point[]): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const active = room.activeStrokes.get(strokeId);
    if (!active) return false;

    // Guard max points per stroke to prevent unbounded memory consumption
    if (active.points.length + points.length <= 10000) {
      active.points.push(...points);
    }
    return true;
  }

  public finalizeStroke(roomId: string, strokeId: string): Stroke | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const stroke = room.activeStrokes.get(strokeId);
    if (!stroke) {
      // Stroke might already be in room.strokes or already finalized
      return null;
    }

    room.activeStrokes.delete(strokeId);

    // Prevent duplicate entries in room.strokes
    if (!room.strokes.some((s) => s.id === stroke.id)) {
      room.strokes.push(stroke);
    }

    return stroke;
  }

  public eraseStrokes(roomId: string, strokeIds: string[]): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const idSet = new Set(strokeIds);
    const beforeCount = room.strokes.length;
    const erasedIds: string[] = [];

    room.strokes = room.strokes.filter((s) => {
      if (idSet.has(s.id)) {
        erasedIds.push(s.id);
        return false;
      }
      return true;
    });

    // Also remove from active strokes if any
    for (const id of strokeIds) {
      if (room.activeStrokes.has(id)) {
        room.activeStrokes.delete(id);
        if (!erasedIds.includes(id)) {
          erasedIds.push(id);
        }
      }
    }

    return erasedIds;
  }

  public getStrokes(roomId: string): Stroke[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return [...room.strokes];
  }

  public cleanActiveStrokesForUser(roomId: string, userId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const cleanedIds: string[] = [];
    for (const [strokeId, stroke] of room.activeStrokes.entries()) {
      if (stroke.userId === userId) {
        cleanedIds.push(strokeId);
        room.activeStrokes.delete(strokeId);
      }
    }
    return cleanedIds;
  }
}

export const roomManager = new RoomManager();
