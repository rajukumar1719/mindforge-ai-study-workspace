import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Collaborator,
  Stroke,
} from '../types/collaboration.js';
import { roomManager } from '../rooms/roomManager.js';
import {
  validateJoinRoomPayload,
  validateDrawStartPayload,
  validateDrawUpdatePayload,
  validateDrawEndPayload,
  validateEraseStrokesPayload,
  validateCursorMovePayload,
} from '../utils/validation.js';
import { assignCollaboratorColor } from '../utils/colors.js';

export function initSocketServer(
  httpServer: HttpServer,
  clientUrl: string
): SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // 1. JOIN_ROOM Handler
    socket.on('JOIN_ROOM', (rawPayload) => {
      // Validate incoming payload safely without blind casting
      const validation = validateJoinRoomPayload(rawPayload);
      if (!validation.valid || !validation.data) {
        socket.emit('ERROR', {
          code: validation.error?.code || 'INVALID_PAYLOAD',
          message: validation.error?.message || 'Invalid payload received.',
        });
        return;
      }

      const { roomId, displayName } = validation.data;

      // Clean up previous room association if socket rejoins
      if (socket.data.roomId && socket.data.user) {
        const prevRoomId = socket.data.roomId;
        const prevUserId = socket.data.user.id;
        socket.leave(prevRoomId);
        roomManager.removeUser(prevRoomId, prevUserId);
        socket.to(prevRoomId).emit('USER_LEFT', { userId: prevUserId });
      }

      // Assign color avoiding duplicates in the room
      const existingUsers = roomManager.getUsers(roomId);
      const color = assignCollaboratorColor(existingUsers);

      // Server is authoritative for identity and assignment
      const collaborator: Collaborator = {
        id: socket.id,
        name: displayName,
        color,
        joinedAt: Date.now(),
      };

      // Store in socket session data and room manager
      socket.data.roomId = roomId;
      socket.data.user = collaborator;

      roomManager.addUser(roomId, collaborator);
      socket.join(roomId);

      // Acknowledge joining socket with room state and roster
      const currentCollaborators = roomManager.getUsers(roomId);
      socket.emit('ROOM_JOINED', {
        roomId,
        user: collaborator,
        collaborators: currentCollaborators,
      });

      // Synchronize existing finalized room drawing state with the new participant
      const existingStrokes = roomManager.getStrokes(roomId);
      socket.emit('SYNC_STATE', {
        strokes: existingStrokes,
      });

      // Notify other participants in the same room
      socket.to(roomId).emit('USER_JOINED', {
        user: collaborator,
      });

      console.log(
        `[WebSocket] ${displayName} (${socket.id}) joined room ${roomId} (Users: ${currentCollaborators.length}, Strokes: ${existingStrokes.length})`
      );
    });

    // 2. DRAW_START Handler
    socket.on('DRAW_START', (rawPayload) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (!roomId || !user) {
        socket.emit('ERROR', {
          code: 'UNAUTHORIZED_ACTION',
          message: 'Must join a room before drawing.',
        });
        return;
      }

      const validation = validateDrawStartPayload(rawPayload);
      if (!validation.valid || !validation.data) {
        socket.emit('ERROR', {
          code: validation.error?.code || 'INVALID_DRAW_START',
          message: validation.error?.message || 'Invalid DRAW_START payload.',
        });
        return;
      }

      const { strokeId, tool, color, width, point } = validation.data;

      // Track active stroke in server room
      const newStroke: Stroke = {
        id: strokeId,
        userId: user.id, // Authoritative server ID
        tool,
        color,
        width,
        points: [point],
        createdAt: Date.now(),
      };

      roomManager.startStroke(roomId, newStroke);

      // Broadcast exclusively to other clients in this room (avoid echo)
      socket.to(roomId).emit('DRAW_START', {
        strokeId,
        userId: user.id,
        tool,
        color,
        width,
        point,
      });
    });

    // 3. DRAW_UPDATE Handler (Batched Points)
    socket.on('DRAW_UPDATE', (rawPayload) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (!roomId || !user) return;

      const validation = validateDrawUpdatePayload(rawPayload);
      if (!validation.valid || !validation.data) {
        return; // Drop invalid batch silently without crashing
      }

      const { strokeId, points } = validation.data;

      // Append points to active stroke in server memory
      roomManager.appendStrokePoints(roomId, strokeId, points);

      // Broadcast points batch to peers in room
      socket.to(roomId).emit('DRAW_UPDATE', {
        strokeId,
        userId: user.id,
        points,
      });
    });

    // 4. DRAW_END Handler
    socket.on('DRAW_END', (rawPayload) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (!roomId || !user) return;

      const validation = validateDrawEndPayload(rawPayload);
      if (!validation.valid || !validation.data) return;

      const { strokeId } = validation.data;

      // Finalize stroke and store in canonical room strokes
      roomManager.finalizeStroke(roomId, strokeId);

      // Broadcast finalization to room peers
      socket.to(roomId).emit('DRAW_END', {
        strokeId,
        userId: user.id,
      });
    });

    // 5. ERASE_STROKES Handler (Logical Stroke Deletion)
    socket.on('ERASE_STROKES', (rawPayload) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (!roomId || !user) return;

      const validation = validateEraseStrokesPayload(rawPayload);
      if (!validation.valid || !validation.data) return;

      const { operationId, strokeIds } = validation.data;

      // Apply stroke deletion to server room state
      const erased = roomManager.eraseStrokes(roomId, strokeIds);
      if (erased.length > 0) {
        socket.to(roomId).emit('ERASE_STROKES', {
          operationId,
          strokeIds: erased,
          userId: user.id,
        });
      }
    });

    // 6. CURSOR_MOVE Handler (Collaborative Live Cursors)
    socket.on('CURSOR_MOVE', (rawPayload) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (!roomId || !user) {
        socket.emit('ERROR', {
          code: 'UNAUTHORIZED_ACTION',
          message: 'Must join a room before sending cursor updates.',
        });
        return;
      }

      const validation = validateCursorMovePayload(rawPayload);
      if (!validation.valid || !validation.data) {
        return; // Drop malformed cursor coordinates safely without crashing
      }

      // Broadcast exclusively to peers in the same room (zero echo, zero leak)
      socket.to(roomId).emit('CURSOR_UPDATE', {
        userId: user.id,
        x: validation.data.x,
        y: validation.data.y,
        timestamp: Date.now(),
      });
    });

    // 7. Disconnect Handler
    socket.on('disconnect', (reason) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (roomId && user) {
        // Clean up any incomplete strokes initiated by this user
        const abandonedStrokes = roomManager.cleanActiveStrokesForUser(roomId, user.id);
        if (abandonedStrokes.length > 0) {
          for (const strokeId of abandonedStrokes) {
            socket.to(roomId).emit('DRAW_END', { strokeId, userId: user.id });
          }
        }

        roomManager.removeUser(roomId, user.id);
        socket.to(roomId).emit('USER_LEFT', { userId: user.id });
        console.log(`[WebSocket] ${user.name} (${user.id}) left room ${roomId} [reason: ${reason}]`);
      }
    });

    socket.on('error', (err) => {
      console.error(`[WebSocket Error] Socket ${socket.id}:`, err.message);
    });
  });

  console.log('[WebSocket] Real-time collaboration gateway initialized.');
  return io;
}
