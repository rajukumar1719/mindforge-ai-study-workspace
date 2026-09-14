import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ConnectionState,
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
  CursorUpdateData,
  CollaborativeOperation,
  OperationAppliedData,
  OperationAckData,
} from './types';
import type { Point } from '../canvas';

export interface CollaborationClientOptions {
  serverUrl?: string;
  roomId: string;
  displayName: string;
  onStatusChange: (status: ConnectionState) => void;
  onRoomJoined: (data: RoomJoinedData) => void;
  onUserJoined: (data: UserJoinedData) => void;
  onUserLeft: (data: UserLeftData) => void;
  onError?: (error: ErrorData) => void;
  onSyncState?: (data: SyncStateData) => void;
  onDrawStart?: (data: DrawStartData) => void;
  onDrawUpdate?: (data: DrawUpdateData) => void;
  onDrawEnd?: (data: DrawEndData) => void;
  onEraseStrokes?: (data: EraseStrokesData) => void;
  onCursorUpdate?: (data: CursorUpdateData) => void;
  onOperationApplied?: (data: OperationAppliedData) => void;
  onOperationAck?: (data: OperationAckData) => void;
}

export interface CollaborationClient {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  disconnect: () => void;
  sendDrawStart: (payload: DrawStartPayload) => void;
  queueStrokePoint: (strokeId: string, point: Point) => void;
  sendDrawEnd: (strokeId: string) => void;
  sendEraseStrokes: (payload: EraseStrokesPayload) => void;
  sendCursorMove: (x: number, y: number) => void;
  sendOperation: (operation: CollaborativeOperation) => void;
  getConnectionState: () => ConnectionState;
  getPingLatency: () => number | null;
}

/**
 * Creates and connects a dedicated Socket.IO client instance for room collaboration.
 * Includes point batching (~25ms interval) and point reduction to prevent WebSocket flooding.
 */
export function createCollaborationClient(
  options: CollaborationClientOptions
): CollaborationClient {
  const url =
    options.serverUrl ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SERVER_URL ||
    (typeof window !== 'undefined' && import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

  options.onStatusChange('connecting');

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // Authoritative Connection State Machine
  let connectionState: ConnectionState = 'connecting';
  const updateState = (next: ConnectionState) => {
    if (connectionState !== next) {
      connectionState = next;
      options.onStatusChange(next);
    }
  };

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

    // Ephemeral point streaming only emitted when connected
    if (connectionState === 'connected') {
      socket.emit('DRAW_UPDATE', {
        strokeId,
        points: pointsToSend,
      });
    }
  };

  const sendDrawStart = (payload: DrawStartPayload) => {
    // Flush any previous in-flight stroke batch
    flushBatch();

    currentBatchStrokeId = payload.strokeId;
    pendingPoints = [];
    lastEnqueuedPoint = payload.point;

    if (connectionState === 'connected') {
      socket.emit('DRAW_START', payload);
    }
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

    if (connectionState === 'connected') {
      socket.emit('DRAW_END', { strokeId });
    }
  };

  const sendEraseStrokes = (payload: EraseStrokesPayload) => {
    if (connectionState === 'connected') {
      socket.emit('ERASE_STROKES', payload);
    }
  };

  // Throttling state for high-frequency cursor movements (~30ms = ~33 updates/sec)
  let pendingCursorPoint: { x: number; y: number } | null = null;
  let lastSentCursorPoint: { x: number; y: number } | null = null;
  let cursorThrottleTimer: number | null = null;

  const flushCursorMove = () => {
    cursorThrottleTimer = null;
    // Ephemeral: completely discard cursor updates when disconnected or offline
    if (!pendingCursorPoint || connectionState !== 'connected') {
      pendingCursorPoint = null;
      return;
    }

    if (lastSentCursorPoint) {
      const dx = pendingCursorPoint.x - lastSentCursorPoint.x;
      const dy = pendingCursorPoint.y - lastSentCursorPoint.y;
      if (dx * dx + dy * dy < 0.25) {
        return;
      }
    }

    lastSentCursorPoint = pendingCursorPoint;
    socket.emit('CURSOR_MOVE', pendingCursorPoint);
  };

  const sendCursorMove = (x: number, y: number) => {
    // Ephemeral guard: Never queue or send cursor position when disconnected
    if (connectionState !== 'connected') return;

    pendingCursorPoint = { x, y };

    if (cursorThrottleTimer === null) {
      cursorThrottleTimer = window.setTimeout(flushCursorMove, 30);
    }
  };

  // Lightweight latency measurement using built-in Socket.IO heartbeats (zero extra network traffic)
  let lastLatencyMs: number | null = null;
  let pingSentTime = 0;

  const bindEnginePing = () => {
    try {
      const engine = (socket.io as unknown as { engine?: { on: (event: string, fn: () => void) => void } }).engine;
      if (engine) {
        engine.on('ping', () => {
          pingSentTime = Date.now();
        });
        engine.on('pong', () => {
          if (pingSentTime > 0) {
            lastLatencyMs = Math.max(1, Date.now() - pingSentTime);
          }
        });
      }
    } catch {
      // Graceful fallback
    }
  };

  bindEnginePing();
  socket.io.on('open', bindEnginePing);

  // 1. Connection lifecycle handlers
  const handleConnect = () => {
    updateState('connected');

    // Automatically emit authoritative JOIN_ROOM on connect and reconnect
    socket.emit('JOIN_ROOM', {
      roomId: options.roomId,
      displayName: options.displayName,
    });
  };

  const handleDisconnect = (reason: string) => {
    if (reason === 'io client disconnect') {
      updateState('disconnected');
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateState('offline');
    } else {
      updateState('reconnecting');
    }
  };

  const handleConnectError = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateState('offline');
    } else {
      updateState('reconnecting');
    }
  };

  const handleReconnectAttempt = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateState('offline');
    } else {
      updateState('reconnecting');
    }
  };

  // Browser online/offline event listeners
  const handleWindowOffline = () => {
    updateState('offline');
  };

  const handleWindowOnline = () => {
    updateState('reconnecting');
    if (!socket.connected) {
      socket.connect();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('offline', handleWindowOffline);
    window.addEventListener('online', handleWindowOnline);
  }

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

  const handleCursorUpdate = (data: CursorUpdateData) => {
    options.onCursorUpdate?.(data);
  };

  const handleOperationApplied = (data: OperationAppliedData) => {
    options.onOperationApplied?.(data);
  };

  const handleOperationAck = (data: OperationAckData) => {
    options.onOperationAck?.(data);
  };

  const sendOperation = (operation: CollaborativeOperation) => {
    flushBatch();
    socket.emit('OPERATION_APPLY', { operation });
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
  socket.on('CURSOR_UPDATE', handleCursorUpdate);
  socket.on('OPERATION_APPLIED', handleOperationApplied);
  socket.on('OPERATION_ACK', handleOperationAck);

  return {
    socket,
    sendDrawStart,
    queueStrokePoint,
    sendDrawEnd,
    sendEraseStrokes,
    sendCursorMove,
    sendOperation,
    getConnectionState: () => connectionState,
    getPingLatency: () => lastLatencyMs,
    disconnect: () => {
      if (batchTimer !== null) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }

      if (cursorThrottleTimer !== null) {
        clearTimeout(cursorThrottleTimer);
        cursorThrottleTimer = null;
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', handleWindowOffline);
        window.removeEventListener('online', handleWindowOnline);
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
      socket.off('CURSOR_UPDATE', handleCursorUpdate);
      socket.off('OPERATION_APPLIED', handleOperationApplied);
      socket.off('OPERATION_ACK', handleOperationAck);

      socket.disconnect();
    },
  };
}
