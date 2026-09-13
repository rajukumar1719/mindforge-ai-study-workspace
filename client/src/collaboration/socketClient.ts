import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ConnectionStatus,
  RoomJoinedData,
  UserJoinedData,
  UserLeftData,
  ErrorData,
} from './types';

export interface CollaborationClientOptions {
  serverUrl?: string;
  roomId: string;
  displayName: string;
  onStatusChange: (status: ConnectionStatus) => void;
  onRoomJoined: (data: RoomJoinedData) => void;
  onUserJoined: (data: UserJoinedData) => void;
  onUserLeft: (data: UserLeftData) => void;
  onError?: (error: ErrorData) => void;
}

export interface CollaborationClient {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  disconnect: () => void;
}

/**
 * Creates and connects a dedicated Socket.IO client instance for room collaboration.
 * Automatically handles reconnection and room rejoining without listener leaks.
 */
export function createCollaborationClient(
  options: CollaborationClientOptions
): CollaborationClient {
  const url = options.serverUrl || import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  options.onStatusChange('connecting');

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // 1. Connection lifecycle handlers
  const handleConnect = () => {
    options.onStatusChange('connected');

    // Automatically emit authoritative JOIN_ROOM on connect and reconnect
    socket.emit('JOIN_ROOM', {
      roomId: options.roomId,
      displayName: options.displayName,
    });
  };

  const handleDisconnect = (reason: string) => {
    if (reason === 'io client disconnect') {
      options.onStatusChange('disconnected');
    } else {
      // Temporary network loss; socket.io will attempt reconnection
      options.onStatusChange('reconnecting');
    }
  };

  const handleConnectError = () => {
    options.onStatusChange('disconnected');
  };

  const handleReconnectAttempt = () => {
    options.onStatusChange('reconnecting');
  };

  // 2. Business event handlers
  const handleRoomJoined = (data: RoomJoinedData) => {
    options.onRoomJoined(data);
  };

  const handleUserJoined = (data: UserJoinedData) => {
    options.onUserJoined(data);
  };

  const handleUserLeft = (data: UserLeftData) => {
    options.onUserLeft(data);
  };

  const handleError = (error: ErrorData) => {
    if (options.onError) {
      options.onError(error);
    } else {
      console.error('[Socket Error]:', error.code, error.message);
    }
  };

  // Register listeners cleanly
  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleConnectError);
  socket.io.on('reconnect_attempt', handleReconnectAttempt);

  socket.on('ROOM_JOINED', handleRoomJoined);
  socket.on('USER_JOINED', handleUserJoined);
  socket.on('USER_LEFT', handleUserLeft);
  socket.on('ERROR', handleError);

  return {
    socket,
    disconnect: () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);

      socket.off('ROOM_JOINED', handleRoomJoined);
      socket.off('USER_JOINED', handleUserJoined);
      socket.off('USER_LEFT', handleUserLeft);
      socket.off('ERROR', handleError);

      socket.disconnect();
    },
  };
}
