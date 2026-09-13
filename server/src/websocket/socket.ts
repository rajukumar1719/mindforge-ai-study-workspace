import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Collaborator,
} from '../types/collaboration.js';
import { roomManager } from '../rooms/roomManager.js';
import { validateJoinRoomPayload } from '../utils/validation.js';
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

      // Notify other participants in the same room
      socket.to(roomId).emit('USER_JOINED', {
        user: collaborator,
      });

      console.log(`[WebSocket] ${displayName} (${socket.id}) joined room ${roomId} (Room users: ${currentCollaborators.length})`);
    });

    // 2. Disconnect Handler
    socket.on('disconnect', (reason) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (roomId && user) {
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
