import type {
  JoinRoomPayload,
  DrawStartPayload,
  DrawUpdatePayload,
  DrawEndPayload,
  EraseStrokesPayload,
} from '../types/collaboration.js';

/**
 * Validates that a room ID is a non-empty, URL-safe string within reasonable length bounds (3-24 chars).
 */
export function isValidRoomId(roomId: unknown): roomId is string {
  if (typeof roomId !== 'string') return false;
  const normalized = roomId.trim().toUpperCase();
  if (normalized.length < 3 || normalized.length > 24) return false;
  return /^[A-Z0-9_-]+$/.test(normalized);
}

/**
 * Validates that a user display name is trimmed, non-empty, and within 2-30 characters.
 */
export function isValidDisplayName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 30;
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

  if (!isValidDisplayName(raw['displayName'])) {
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
      displayName: (raw['displayName'] as string).trim(),
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
