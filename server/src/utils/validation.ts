import type {
  JoinRoomPayload,
  DrawStartPayload,
  DrawUpdatePayload,
  DrawEndPayload,
  EraseStrokesPayload,
  CursorMovePayload,
  OperationApplyPayload,
  Stroke,
  Point,
} from '../types/collaboration.js';

/**
 * Section 11 Security & Hardening Resource Limits
 */
export const MAX_POINTS_PER_UPDATE = 500;
export const MAX_STROKE_POINTS = 10000;
export const MAX_ACTIVE_STROKES_PER_USER = 10;
export const MAX_ACTIVE_STROKES_PER_ROOM = 100;
export const MAX_USERS_PER_ROOM = 50;
export const MAX_OPERATIONS_PER_ROOM = 10000;
export const MAX_STROKES_PER_ROOM = 5000;

/**
 * Validates that a room ID is a non-empty, URL-safe string within reasonable length bounds (3-24 chars).
 * Strictly enforces alphanumeric characters with underscores and hyphens.
 */
export function isValidRoomId(roomId: unknown): roomId is string {
  if (typeof roomId !== 'string') return false;
  const normalized = roomId.trim().toUpperCase();
  if (normalized.length < 3 || normalized.length > 24) return false;
  return /^[A-Z0-9_-]+$/.test(normalized);
}

/**
 * Strips non-printable control characters, zero-width characters, and normalizes whitespace
 * while preserving legitimate international Unicode names (accents, Asian scripts, emoji, etc.).
 */
export function sanitizeDisplayName(name: unknown): string {
  if (typeof name !== 'string') return '';
  // Strip ASCII and Unicode control characters and zero-width spaces
  const stripped = name.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '');
  // Collapse multiple whitespace characters to single space and trim
  return stripped.replace(/\s+/g, ' ').trim();
}

/**
 * Validates that a user display name, after stripping control characters, is between 2 and 30 characters.
 */
export function isValidDisplayName(name: unknown): name is string {
  const sanitized = sanitizeDisplayName(name);
  return sanitized.length >= 2 && sanitized.length <= 30;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Validates the runtime shape of the JOIN_ROOM payload safely without blind casting.
 * Sanitizes the display name to remove control characters.
 */
export function validateJoinRoomPayload(payload: unknown): ValidationResult<JoinRoomPayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Payload must be a JSON object.',
      },
    };
  }

  const raw = payload as Record<string, unknown>;

  if (!isValidRoomId(raw['roomId'])) {
    return {
      valid: false,
      error: {
        code: 'INVALID_ROOM_ID',
        message: 'Room ID must be 3–24 alphanumeric characters.',
      },
    };
  }

  const sanitizedName = sanitizeDisplayName(raw['displayName']);
  if (sanitizedName.length < 2 || sanitizedName.length > 30) {
    return {
      valid: false,
      error: {
        code: 'INVALID_DISPLAY_NAME',
        message: 'Display name must be between 2 and 30 characters.',
      },
    };
  }

  return {
    valid: true,
    data: {
      roomId: (raw['roomId'] as string).trim().toUpperCase(),
      displayName: sanitizedName,
    },
  };
}

/**
 * Validates stroke IDs (1 to 64 alphanumeric chars with hyphens/underscores).
 */
export function isValidStrokeId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  return trimmed.length >= 1 && trimmed.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Validates drawing tool identifier.
 */
export function isValidTool(tool: unknown): tool is 'pen' | 'highlighter' | 'eraser' {
  return tool === 'pen' || tool === 'highlighter' || tool === 'eraser';
}

/**
 * Validates hex or rgb color string.
 */
export function isValidColor(color: unknown): color is string {
  if (typeof color !== 'string') return false;
  const trimmed = color.trim();
  if (trimmed.length < 4 || trimmed.length > 32) return false;
  return /^#([0-9a-fA-F]{3,8})$/.test(trimmed) || /^rgba?\(.+\)$/.test(trimmed);
}

/**
 * Validates stroke width within reasonable bounds (1 to 100px).
 */
export function isValidWidth(width: unknown): width is number {
  return typeof width === 'number' && Number.isFinite(width) && width >= 0.5 && width <= 150;
}

/**
 * Validates single 2D point coordinates.
 */
export function isValidPoint(point: unknown): point is { x: number; y: number; pressure?: number } {
  if (!point || typeof point !== 'object') return false;
  const pt = point as Record<string, unknown>;
  if (typeof pt['x'] !== 'number' || !Number.isFinite(pt['x'])) return false;
  if (typeof pt['y'] !== 'number' || !Number.isFinite(pt['y'])) return false;
  if (Math.abs(pt['x']) > 100000 || Math.abs(pt['y']) > 100000) return false;

  if (pt['pressure'] !== undefined) {
    if (typeof pt['pressure'] !== 'number' || !Number.isFinite(pt['pressure'])) return false;
  }
  return true;
}

/**
 * Validates DRAW_START payload.
 */
export function validateDrawStartPayload(payload: unknown): ValidationResult<DrawStartPayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: { code: 'INVALID_PAYLOAD', message: 'DRAW_START payload must be an object.' },
    };
  }

  const raw = payload as Record<string, unknown>;

  if (!isValidStrokeId(raw['strokeId'])) {
    return {
      valid: false,
      error: { code: 'INVALID_STROKE_ID', message: 'Invalid or missing strokeId.' },
    };
  }

  if (!isValidTool(raw['tool'])) {
    return {
      valid: false,
      error: { code: 'INVALID_TOOL', message: 'Tool must be pen, highlighter, or eraser.' },
    };
  }

  if (!isValidColor(raw['color'])) {
    return {
      valid: false,
      error: { code: 'INVALID_COLOR', message: 'Invalid color format.' },
    };
  }

  if (!isValidWidth(raw['width'])) {
    return {
      valid: false,
      error: { code: 'INVALID_WIDTH', message: 'Stroke width must be between 0.5 and 150.' },
    };
  }

  if (!isValidPoint(raw['point'])) {
    return {
      valid: false,
      error: { code: 'INVALID_POINT', message: 'Invalid point coordinates.' },
    };
  }

  return {
    valid: true,
    data: {
      strokeId: raw['strokeId'].trim(),
      tool: raw['tool'],
      color: raw['color'].trim(),
      width: raw['width'],
      point: {
        x: (raw['point'] as { x: number; y: number; pressure?: number }).x,
        y: (raw['point'] as { x: number; y: number; pressure?: number }).y,
        pressure: (raw['point'] as { x: number; y: number; pressure?: number }).pressure,
      },
    },
  };
}

/**
 * Validates DRAW_UPDATE payload.
 */
export function validateDrawUpdatePayload(payload: unknown): ValidationResult<DrawUpdatePayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: { code: 'INVALID_PAYLOAD', message: 'DRAW_UPDATE payload must be an object.' },
    };
  }

  const raw = payload as Record<string, unknown>;

  if (!isValidStrokeId(raw['strokeId'])) {
    return {
      valid: false,
      error: { code: 'INVALID_STROKE_ID', message: 'Invalid or missing strokeId.' },
    };
  }

  const points = raw['points'];
  if (!Array.isArray(points) || points.length === 0 || points.length > 500) {
    return {
      valid: false,
      error: {
        code: 'INVALID_POINTS_BATCH',
        message: 'Points must be a non-empty array with at most 500 points.',
      },
    };
  }

  for (let i = 0; i < points.length; i++) {
    if (!isValidPoint(points[i])) {
      return {
        valid: false,
        error: { code: 'INVALID_POINT_IN_BATCH', message: `Point at index ${i} is invalid.` },
      };
    }
  }

  return {
    valid: true,
    data: {
      strokeId: raw['strokeId'].trim(),
      points: points.map((p: { x: number; y: number; pressure?: number }) => ({
        x: p.x,
        y: p.y,
        pressure: p.pressure,
      })),
    },
  };
}

/**
 * Validates DRAW_END payload.
 */
export function validateDrawEndPayload(payload: unknown): ValidationResult<DrawEndPayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: { code: 'INVALID_PAYLOAD', message: 'DRAW_END payload must be an object.' },
    };
  }

  const raw = payload as Record<string, unknown>;

  if (!isValidStrokeId(raw['strokeId'])) {
    return {
      valid: false,
      error: { code: 'INVALID_STROKE_ID', message: 'Invalid or missing strokeId.' },
    };
  }

  return {
    valid: true,
    data: {
      strokeId: raw['strokeId'].trim(),
    },
  };
}

/**
 * Validates ERASE_STROKES payload.
 */
export function validateEraseStrokesPayload(payload: unknown): ValidationResult<EraseStrokesPayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: { code: 'INVALID_PAYLOAD', message: 'ERASE_STROKES payload must be an object.' },
    };
  }

  const raw = payload as Record<string, unknown>;

  if (typeof raw['operationId'] !== 'string' || raw['operationId'].trim().length === 0) {
    return {
      valid: false,
      error: { code: 'INVALID_OPERATION_ID', message: 'Invalid or missing operationId.' },
    };
  }

  const strokeIds = raw['strokeIds'];
  if (!Array.isArray(strokeIds) || strokeIds.length === 0 || strokeIds.length > 1000) {
    return {
      valid: false,
      error: {
        code: 'INVALID_STROKE_IDS',
        message: 'strokeIds must be a non-empty array with at most 1000 IDs.',
      },
    };
  }

  for (let i = 0; i < strokeIds.length; i++) {
    if (!isValidStrokeId(strokeIds[i])) {
      return {
        valid: false,
        error: { code: 'INVALID_STROKE_ID_IN_LIST', message: `Stroke ID at index ${i} is invalid.` },
      };
    }
  }

  return {
    valid: true,
    data: {
      operationId: raw['operationId'].trim(),
      strokeIds: strokeIds.map((id: string) => id.trim()),
    },
  };
}

/**
 * Validates CURSOR_MOVE payload.
 */
export function validateCursorMovePayload(payload: unknown): ValidationResult<CursorMovePayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: { code: 'INVALID_PAYLOAD', message: 'CURSOR_MOVE payload must be an object.' },
    };
  }

  const raw = payload as Record<string, unknown>;
  const x = raw['x'];
  const y = raw['y'];

  if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
    return {
      valid: false,
      error: { code: 'INVALID_COORDINATES', message: 'Cursor coordinates must be finite numbers.' },
    };
  }

  if (Math.abs(x) > 100000 || Math.abs(y) > 100000) {
    return {
      valid: false,
      error: { code: 'COORDINATES_OUT_OF_BOUNDS', message: 'Cursor coordinates out of allowed bounds.' },
    };
  }

  return {
    valid: true,
    data: {
      x,
      y,
    },
  };
}

/**
 * Validates operation IDs (1 to 128 characters, alphanumeric + safe symbols).
 */
export function isValidOperationId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  return trimmed.length >= 1 && trimmed.length <= 128 && /^[a-zA-Z0-9_\-.:]+$/.test(trimmed);
}

/**
 * Validates OPERATION_APPLY payload.
 */
export function validateOperationApplyPayload(
  payload: unknown
): ValidationResult<OperationApplyPayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: { code: 'INVALID_PAYLOAD', message: 'OPERATION_APPLY payload must be an object.' },
    };
  }

  const raw = payload as Record<string, unknown>;
  const opRaw = raw['operation'];
  if (!opRaw || typeof opRaw !== 'object' || Array.isArray(opRaw)) {
    return {
      valid: false,
      error: { code: 'INVALID_OPERATION', message: 'Payload must contain a valid operation object.' },
    };
  }

  const op = opRaw as Record<string, unknown>;
  const operationId = op['operationId'];
  if (!isValidOperationId(operationId)) {
    return {
      valid: false,
      error: { code: 'INVALID_OPERATION_ID', message: 'Operation must have a valid operationId.' },
    };
  }

  const type = op['type'];
  const validTypes = ['add-stroke', 'erase-strokes', 'clear-canvas', 'undo', 'redo'];
  if (typeof type !== 'string' || !validTypes.includes(type)) {
    return {
      valid: false,
      error: { code: 'INVALID_OPERATION_TYPE', message: `Unknown operation type: ${String(type)}` },
    };
  }

  const timestamp = typeof op['timestamp'] === 'number' && Number.isFinite(op['timestamp']) && op['timestamp'] > 0
    ? op['timestamp']
    : Date.now();

  const userId = typeof op['userId'] === 'string' ? op['userId'].trim() : '';

  if (type === 'add-stroke') {
    const strokeRaw = op['stroke'];
    if (!strokeRaw || typeof strokeRaw !== 'object' || Array.isArray(strokeRaw)) {
      return {
        valid: false,
        error: { code: 'INVALID_STROKE', message: 'add-stroke operation requires a valid stroke.' },
      };
    }
    const s = strokeRaw as Record<string, unknown>;
    if (!isValidStrokeId(s['id'])) {
      return { valid: false, error: { code: 'INVALID_STROKE_ID', message: 'Invalid stroke id.' } };
    }
    if (!isValidTool(s['tool'])) {
      return { valid: false, error: { code: 'INVALID_TOOL', message: 'Invalid tool in stroke.' } };
    }
    if (!isValidColor(s['color'])) {
      return { valid: false, error: { code: 'INVALID_COLOR', message: 'Invalid color in stroke.' } };
    }
    if (!isValidWidth(s['width'])) {
      return { valid: false, error: { code: 'INVALID_WIDTH', message: 'Invalid stroke width.' } };
    }
    if (!Array.isArray(s['points']) || s['points'].length === 0) {
      return { valid: false, error: { code: 'EMPTY_POINTS', message: 'Stroke must contain points.' } };
    }
    if (s['points'].length > 10000) {
      return { valid: false, error: { code: 'EXCESSIVE_POINTS', message: 'Stroke exceeds 10,000 points limit.' } };
    }
    for (const pt of s['points']) {
      if (!isValidPoint(pt)) {
        return { valid: false, error: { code: 'INVALID_POINT', message: 'Invalid point in stroke.' } };
      }
    }

    const stroke: Stroke = {
      id: s['id'].trim(),
      userId: typeof s['userId'] === 'string' && s['userId'].trim() ? s['userId'].trim() : userId,
      tool: s['tool'],
      color: s['color'].trim(),
      width: s['width'],
      points: s['points'] as Point[],
      createdAt: typeof s['createdAt'] === 'number' && Number.isFinite(s['createdAt']) ? s['createdAt'] : timestamp,
    };

    return {
      valid: true,
      data: {
        operation: {
          operationId: operationId.trim(),
          type: 'add-stroke',
          userId,
          stroke,
          timestamp,
        },
      },
    };
  }

  if (type === 'erase-strokes') {
    const strokeIds = op['strokeIds'];
    if (!Array.isArray(strokeIds) || strokeIds.length === 0) {
      return {
        valid: false,
        error: { code: 'EMPTY_STROKE_IDS', message: 'erase-strokes requires at least one stroke ID.' },
      };
    }
    if (strokeIds.length > 1000) {
      return {
        valid: false,
        error: { code: 'EXCESSIVE_STROKE_IDS', message: 'Cannot erase more than 1,000 strokes at once.' },
      };
    }
    for (const id of strokeIds) {
      if (!isValidStrokeId(id)) {
        return { valid: false, error: { code: 'INVALID_STROKE_ID', message: `Invalid stroke ID in erase list: ${String(id)}` } };
      }
    }

    return {
      valid: true,
      data: {
        operation: {
          operationId: operationId.trim(),
          type: 'erase-strokes',
          userId,
          strokeIds: strokeIds.map((id: string) => id.trim()),
          timestamp,
        },
      },
    };
  }

  if (type === 'clear-canvas') {
    return {
      valid: true,
      data: {
        operation: {
          operationId: operationId.trim(),
          type: 'clear-canvas',
          userId,
          timestamp,
        },
      },
    };
  }

  if (type === 'undo') {
    const targetOperationId = op['targetOperationId'];
    if (!isValidOperationId(targetOperationId)) {
      return {
        valid: false,
        error: { code: 'INVALID_TARGET_OPERATION_ID', message: 'undo requires a valid targetOperationId.' },
      };
    }
    return {
      valid: true,
      data: {
        operation: {
          operationId: operationId.trim(),
          type: 'undo',
          userId,
          targetOperationId: targetOperationId.trim(),
          timestamp,
        },
      },
    };
  }

  if (type === 'redo') {
    const targetOperationId = op['targetOperationId'];
    if (!isValidOperationId(targetOperationId)) {
      return {
        valid: false,
        error: { code: 'INVALID_TARGET_OPERATION_ID', message: 'redo requires a valid targetOperationId.' },
      };
    }
    return {
      valid: true,
      data: {
        operation: {
          operationId: operationId.trim(),
          type: 'redo',
          userId,
          targetOperationId: targetOperationId.trim(),
          timestamp,
        },
      },
    };
  }

  return {
    valid: false,
    error: { code: 'INVALID_OPERATION', message: 'Unrecognized operation configuration.' },
  };
}
