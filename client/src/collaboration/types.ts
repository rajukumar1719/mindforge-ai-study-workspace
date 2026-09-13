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

export interface ClientToServerEvents {
  JOIN_ROOM: (payload: { roomId: string; displayName: string }) => void;
}

export interface ServerToClientEvents {
  ROOM_JOINED: (data: RoomJoinedData) => void;
  USER_JOINED: (data: UserJoinedData) => void;
  USER_LEFT: (data: UserLeftData) => void;
  ERROR: (error: ErrorData) => void;
}
