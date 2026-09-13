import type { Point, Stroke, DrawingTool } from '../canvas';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RoomJoinedData {
  roomId: string;
  user: Collaborator;
  collaborators: Collaborator[];
}

export interface UserJoinedData {
  user: Collaborator;
}

export interface UserLeftData {
  userId: string;
}

export interface ErrorData {
  code: string;
  message: string;
}

export interface DrawStartPayload {
  strokeId: string;
  tool: DrawingTool;
  color: string;
  width: number;
  point: Point;
}

export interface DrawStartData extends DrawStartPayload {
  userId: string;
}

export interface DrawUpdatePayload {
  strokeId: string;
  points: Point[];
}

export interface DrawUpdateData extends DrawUpdatePayload {
  userId: string;
}

export interface DrawEndPayload {
  strokeId: string;
}

export interface DrawEndData extends DrawEndPayload {
  userId: string;
}

export interface EraseStrokesPayload {
  operationId: string;
  strokeIds: string[];
}

export interface EraseStrokesData extends EraseStrokesPayload {
  userId: string;
}

export interface SyncStateData {
  strokes: Stroke[];
}

export interface ClientToServerEvents {
  JOIN_ROOM: (payload: { roomId: string; displayName: string }) => void;
  DRAW_START: (payload: DrawStartPayload) => void;
  DRAW_UPDATE: (payload: DrawUpdatePayload) => void;
  DRAW_END: (payload: DrawEndPayload) => void;
  ERASE_STROKES: (payload: EraseStrokesPayload) => void;
}

export interface ServerToClientEvents {
  ROOM_JOINED: (data: RoomJoinedData) => void;
  USER_JOINED: (data: UserJoinedData) => void;
  USER_LEFT: (data: UserLeftData) => void;
  ERROR: (error: ErrorData) => void;
  SYNC_STATE: (data: SyncStateData) => void;
  DRAW_START: (data: DrawStartData) => void;
  DRAW_UPDATE: (data: DrawUpdateData) => void;
  DRAW_END: (data: DrawEndData) => void;
  ERASE_STROKES: (data: EraseStrokesData) => void;
}
