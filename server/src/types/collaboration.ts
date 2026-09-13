/**
 * Real-Time Collaboration Type Definitions (Server Authority)
 */

export interface Collaborator {
  id: string;        // Server-assigned socket identifier
  name: string;      // Validated display name
  color: string;     // Server-assigned distinct hex color
  joinedAt: number;  // Epoch timestamp (ms)
}

export interface Room {
  roomId: string;
  users: Map<string, Collaborator>;
  createdAt: number;
}

export interface JoinRoomPayload {
  roomId: string;
  displayName: string;
}

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

export interface ClientToServerEvents {
  JOIN_ROOM: (payload: unknown) => void;
}

export interface ServerToClientEvents {
  ROOM_JOINED: (data: RoomJoinedData) => void;
  USER_JOINED: (data: UserJoinedData) => void;
  USER_LEFT: (data: UserLeftData) => void;
  ERROR: (error: ErrorData) => void;
}

export interface SocketData {
  roomId?: string;
  user?: Collaborator;
}
