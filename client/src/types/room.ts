export type RoomId = string;

export interface UserSession {
  displayName: string;
}

export interface CreateRoomFormValues {
  displayName: string;
}

export interface JoinRoomFormValues {
  displayName: string;
  roomId: string;
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export type ActiveModal = 'create' | 'join' | null;
