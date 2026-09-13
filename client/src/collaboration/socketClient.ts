import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ConnectionStatus,
  RoomJoinedData,
  UserJoinedData,
  UserLeftData,
  ErrorData,
  DrawStartPayload,
  DrawStartData,
  DrawUpdateData,
  DrawEndData,
  EraseStrokesPayload,
  EraseStrokesData,
  SyncStateData,
} from './types';
import type { Point } from '../canvas';

export interface CollaborationClientOptions {
  serverUrl?: string;
  roomId: string;
  displayName: string;
  onStatusChange: (status: ConnectionStatus) => void;
  onRoomJoined: (data: RoomJoinedData) => void;
  onUserJoined: (data: UserJoinedData) => void;
  onUserLeft: (data: UserLeftData) => void;
  onError?: (error: ErrorData) => void;
  onSyncState?: (data: SyncStateData) => void;
  onDrawStart?: (data: DrawStartData) => void;
  onDrawUpdate?: (data: DrawUpdateData) => void;
  onDrawEnd?: (data: DrawEndData) => void;
  onEraseStrokes?: (data: EraseStrokesData) => void;
}

export interface CollaborationClient {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  disconnect: () => void;
  sendDrawStart: (payload: DrawStartPayload) => void;
  queueStrokePoint: (strokeId: string, point: Point) => void;
  sendDrawEnd: (strokeId: string) => void;
  sendEraseStrokes: (payload: EraseStrokesPayload) => void;
}

/**
 * Creates and connects a dedicated Socket.IO client instance for room collaboration.
 * Includes point batching (~25ms interval) and point reduction to prevent WebSocket flooding.
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

  // Batching state for high-frequency pointer move points
  let currentBatchStrokeId: string | null = null;
  let pendingPoints: Point[] = [];
  let batchTimer: number | null = null;
  let lastEnqueuedPoint: Point | null = null;

  const flushBatch = () => {
    if (batchTimer !== null) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }

    if (!currentBatchStrokeId || pendingPoints.length === 0) {
      return;
    }

    const strokeId = currentBatchStrokeId;
    const pointsToSend = pendingPoints;
    pendingPoints = [];

    socket.emit('DRAW_UPDATE', {
      strokeId,
      points: pointsToSend,
    });
  };

  const sendDrawStart = (payload: DrawStartPayload) => {
    // Flush any previous in-flight stroke batch
    flushBatch();

    currentBatchStrokeId = payload.strokeId;
    pendingPoints = [];
    lastEnqueuedPoint = payload.point;

    socket.emit('DRAW_START', payload);
  };

  const queueStrokePoint = (strokeId: string, point: Point) => {
    // If stroke ID mismatch, flush current batch and reset
    if (currentBatchStrokeId !== strokeId) {
      flushBatch();
      currentBatchStrokeId = strokeId;
      pendingPoints = [];
      lastEnqueuedPoint = null;
    }

    // Point reduction: Skip points less than 1.0px Euclidean distance from previous point
    if (lastEnqueuedPoint) {
      const dx = point.x - lastEnqueuedPoint.x;
      const dy = point.y - lastEnqueuedPoint.y;
      if (dx * dx + dy * dy < 1.0) {
        return;
      }
    }

    pendingPoints.push(point);
    lastEnqueuedPoint = point;

    // If batch reaches threshold size, flush immediately
    if (pendingPoints.length >= 20) {
      flushBatch();
    } else if (batchTimer === null) {
      // Schedule flush within ~25ms window (~40 updates/sec)
      batchTimer = window.setTimeout(flushBatch, 25);
    }
  };

  const sendDrawEnd = (strokeId: string) => {
    // Flush any remaining accumulated points before finalizing
    flushBatch();
    currentBatchStrokeId = null;
    lastEnqueuedPoint = null;

    socket.emit('DRAW_END', { strokeId });
  };

  const sendEraseStrokes = (payload: EraseStrokesPayload) => {
    socket.emit('ERASE_STROKES', payload);
  };

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

  const handleSyncState = (data: SyncStateData) => {
    options.onSyncState?.(data);
  };

  const handleDrawStart = (data: DrawStartData) => {
    options.onDrawStart?.(data);
  };

  const handleDrawUpdate = (data: DrawUpdateData) => {
    options.onDrawUpdate?.(data);
  };

  const handleDrawEnd = (data: DrawEndData) => {
    options.onDrawEnd?.(data);
  };

  const handleEraseStrokes = (data: EraseStrokesData) => {
    options.onEraseStrokes?.(data);
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

  socket.on('SYNC_STATE', handleSyncState);
  socket.on('DRAW_START', handleDrawStart);
  socket.on('DRAW_UPDATE', handleDrawUpdate);
  socket.on('DRAW_END', handleDrawEnd);
  socket.on('ERASE_STROKES', handleEraseStrokes);

  return {
    socket,
    sendDrawStart,
    queueStrokePoint,
    sendDrawEnd,
    sendEraseStrokes,
    disconnect: () => {
      if (batchTimer !== null) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }

      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);

      socket.off('ROOM_JOINED', handleRoomJoined);
      socket.off('USER_JOINED', handleUserJoined);
      socket.off('USER_LEFT', handleUserLeft);
      socket.off('ERROR', handleError);

      socket.off('SYNC_STATE', handleSyncState);
      socket.off('DRAW_START', handleDrawStart);
      socket.off('DRAW_UPDATE', handleDrawUpdate);
      socket.off('DRAW_END', handleDrawEnd);
      socket.off('ERASE_STROKES', handleEraseStrokes);

      socket.disconnect();
    },
  };
}
