/**
 * Real-Time Collaboration Type Definitions (Server Authority)
 */

export type DrawingTool = 'pen' | 'highlighter' | 'eraser';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  userId: string;
  tool: DrawingTool;
  color: string;
  width: number;
  points: Point[];
  createdAt: number;
}

export interface Collaborator {
  id: string;        // Server-assigned socket identifier
  name: string;      // Validated display name
  color: string;     // Server-assigned distinct hex color
  joinedAt: number;  // Epoch timestamp (ms)
}

export interface Room {
  roomId: string;
  users: Map<string, Collaborator>;
  strokes: Stroke[];
  activeStrokes: Map<string, Stroke>; // In-flight strokes keyed by strokeId
  operations: OperationRecord[];
  appliedOperationIds: Set<string>;
  operationMap: Map<string, OperationRecord>; // O(1) indexed lookup by operationId
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

export type CollaborativeOperationType =
  | 'add-stroke'
  | 'erase-strokes'
  | 'clear-canvas'
  | 'undo'
  | 'redo';

export interface BaseCollaborativeOperation {
  operationId: string;
  type: CollaborativeOperationType;
  userId: string;
  timestamp: number;
}

export interface AddStrokeOperation extends BaseCollaborativeOperation {
  type: 'add-stroke';
  stroke: Stroke;
}

export interface EraseStrokesOperation extends BaseCollaborativeOperation {
  type: 'erase-strokes';
  strokeIds: string[];
}

export interface ClearCanvasOperation extends BaseCollaborativeOperation {
  type: 'clear-canvas';
}

export interface UndoOperation extends BaseCollaborativeOperation {
  type: 'undo';
  targetOperationId: string;
}

export interface RedoOperation extends BaseCollaborativeOperation {
  type: 'redo';
  targetOperationId: string;
}

export type CollaborativeOperation =
  | AddStrokeOperation
  | EraseStrokesOperation
  | ClearCanvasOperation
  | UndoOperation
  | RedoOperation;

export interface OperationRecord {
  operation: CollaborativeOperation;
  active: boolean;
}

export interface OperationApplyPayload {
  operation: CollaborativeOperation;
}

export interface OperationAppliedData {
  operation: CollaborativeOperation;
}

export interface SyncStateData {
  strokes: Stroke[];
  operations?: OperationRecord[];
}

export interface CursorMovePayload {
  x: number;
  y: number;
}

export interface CursorUpdateData {
  userId: string;
  x: number;
  y: number;
  timestamp?: number;
}

export interface ClientToServerEvents {
  JOIN_ROOM: (payload: unknown) => void;
  DRAW_START: (payload: unknown) => void;
  DRAW_UPDATE: (payload: unknown) => void;
  DRAW_END: (payload: unknown) => void;
  ERASE_STROKES: (payload: unknown) => void;
  CURSOR_MOVE: (payload: unknown) => void;
  OPERATION_APPLY: (payload: unknown) => void;
}

export interface OperationAckData {
  operationId: string;
  accepted: boolean;
  reason?: string;
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
  CURSOR_UPDATE: (data: CursorUpdateData) => void;
  OPERATION_APPLIED: (data: OperationAppliedData) => void;
  OPERATION_ACK: (data: OperationAckData) => void;
}

export interface SocketData {
  roomId?: string;
  user?: Collaborator;
}
