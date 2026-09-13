import type { CollaborativeOperation, CollaborativeOperationType } from './types';

export const PENDING_OPERATIONS_STORAGE_KEY = 'syncdraw:pending-operations:v1';
export const MAX_PENDING_OPERATIONS = 500;

export interface PendingOperationRecord {
  roomId: string;
  userSessionId: string;
  operation: CollaborativeOperation;
  status: 'pending' | 'sent';
  createdAt: number;
  retryCount: number;
}

const VALID_OPERATION_TYPES: Set<CollaborativeOperationType> = new Set([
  'add-stroke',
  'erase-strokes',
  'clear-canvas',
  'undo',
  'redo',
]);

/**
 * Validates whether an unknown object is a valid CollaborativeOperation.
 */
export function isValidCollaborativeOperation(obj: unknown): obj is CollaborativeOperation {
  if (!obj || typeof obj !== 'object') return false;

  const candidate = obj as Record<string, unknown>;
  if (
    typeof candidate.operationId !== 'string' ||
    candidate.operationId.trim().length === 0 ||
    candidate.operationId.length > 128
  ) {
    return false;
  }

  if (
    typeof candidate.type !== 'string' ||
    !VALID_OPERATION_TYPES.has(candidate.type as CollaborativeOperationType)
  ) {
    return false;
  }

  if (typeof candidate.userId !== 'string') return false;
  if (typeof candidate.timestamp !== 'number') return false;

  switch (candidate.type) {
    case 'add-stroke': {
      if (!candidate.stroke || typeof candidate.stroke !== 'object') return false;
      const s = candidate.stroke as Record<string, unknown>;
      return (
        typeof s.id === 'string' &&
        typeof s.tool === 'string' &&
        typeof s.color === 'string' &&
        typeof s.width === 'number' &&
        Array.isArray(s.points)
      );
    }
    case 'erase-strokes':
      return Array.isArray(candidate.strokeIds);
    case 'clear-canvas':
      return true;
    case 'undo':
    case 'redo':
      return typeof candidate.targetOperationId === 'string';
    default:
      return false;
  }
}

/**
 * Validates whether an unknown item from storage satisfies PendingOperationRecord schema.
 */
export function isValidPendingRecord(item: unknown): item is PendingOperationRecord {
  if (!item || typeof item !== 'object') return false;

  const rec = item as Record<string, unknown>;
  if (typeof rec.roomId !== 'string' || !rec.roomId.trim()) return false;
  if (typeof rec.userSessionId !== 'string' || !rec.userSessionId.trim()) return false;
  if (rec.status !== 'pending' && rec.status !== 'sent') return false;
  if (typeof rec.createdAt !== 'number') return false;
  if (typeof rec.retryCount !== 'number') return false;

  return isValidCollaborativeOperation(rec.operation);
}

/**
 * Safely reads all valid pending records from browser localStorage.
 */
export function readAllPendingRecordsFromStorage(): PendingOperationRecord[] {
  try {
    const raw = localStorage.getItem(PENDING_OPERATIONS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[PendingQueue] Malformed pending operations in storage (not an array), ignoring.');
      return [];
    }

    const validRecords: PendingOperationRecord[] = [];
    for (const item of parsed) {
      if (isValidPendingRecord(item)) {
        validRecords.push(item);
      } else {
        console.warn('[PendingQueue] Discarded malformed pending operation entry from storage:', item);
      }
    }
    return validRecords;
  } catch (err) {
    console.error('[PendingQueue] Error parsing pending operations storage, resetting safely:', err);
    return [];
  }
}

/**
 * Safely persists records to browser localStorage, preserving entries from other rooms/sessions.
 */
export function writePendingRecordsToStorage(
  roomId: string,
  userSessionId: string,
  recordsForCurrentScope: PendingOperationRecord[]
): void {
  try {
    const allRecords = readAllPendingRecordsFromStorage();
    // Filter out previous records for THIS room and session
    const otherRecords = allRecords.filter(
      (r) => !(r.roomId === roomId && r.userSessionId === userSessionId)
    );

    // Enforce capacity bounds (most recent operations kept)
    const boundedCurrent = recordsForCurrentScope.slice(-MAX_PENDING_OPERATIONS);
    const merged = [...otherRecords, ...boundedCurrent];

    if (merged.length === 0) {
      localStorage.removeItem(PENDING_OPERATIONS_STORAGE_KEY);
    } else {
      try {
        localStorage.setItem(PENDING_OPERATIONS_STORAGE_KEY, JSON.stringify(merged));
      } catch (storageErr) {
        console.warn(
          '[PendingQueue] localStorage quota exceeded or storage unavailable; operations retained in memory only:',
          storageErr
        );
      }
    }
  } catch (err) {
    console.error('[PendingQueue] Error writing pending operations to storage:', err);
  }
}

/**
 * Client-Side Durable Pending Operation Queue
 * Manages in-memory queue and synchronizes with localStorage.
 */
export class PendingOperationQueue {
  private records: PendingOperationRecord[] = [];
  private roomId: string;
  private userSessionId: string;

  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  private handleBeforeUnload = (): void => {
    if (this.persistTimer !== null) {
      this.persistImmediate();
    }
  };

  constructor(roomId: string, userSessionId: string) {
    this.roomId = roomId;
    this.userSessionId = userSessionId;
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public getUserSessionId(): string {
    return this.userSessionId;
  }

  /**
   * Loads persisted pending operations strictly matching roomId and userSessionId.
   */
  public loadFromStorage(): void {
    const allRecords = readAllPendingRecordsFromStorage();
    this.records = allRecords.filter(
      (r) => r.roomId === this.roomId && r.userSessionId === this.userSessionId
    );
  }

  /**
   * Persists current in-memory queue to localStorage immediately.
   */
  public persistImmediate(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    writePendingRecordsToStorage(this.roomId, this.userSessionId, this.records);
  }

  /**
   * Debounces localStorage persistence during bursts of rapid acknowledgments or status updates.
   */
  private schedulePersist(debounceMs = 50): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      writePendingRecordsToStorage(this.roomId, this.userSessionId, this.records);
    }, debounceMs);
  }

  /**
   * Enqueues an operation locally with immediate durable persistence.
   */
  public enqueue(op: CollaborativeOperation): void {
    // Enforce max pending operations cap
    if (this.records.length >= MAX_PENDING_OPERATIONS) {
      console.warn(
        `[PendingQueue] Queue reached maximum capacity of ${MAX_PENDING_OPERATIONS} operations. Dropping operation ${op.operationId}.`
      );
      return;
    }

    // Avoid duplicate enqueuing of the same operationId
    const existingIndex = this.records.findIndex((r) => r.operation.operationId === op.operationId);
    if (existingIndex >= 0) {
      return;
    }

    const record: PendingOperationRecord = {
      roomId: this.roomId,
      userSessionId: this.userSessionId,
      operation: op,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.records.push(record);
    this.persistImmediate();
  }

  /**
   * Marks an operation as in-flight / sent to socket (debounced write).
   */
  public markSent(operationId: string): void {
    const record = this.records.find((r) => r.operation.operationId === operationId);
    if (record) {
      record.status = 'sent';
      record.retryCount += 1;
      this.schedulePersist();
    }
  }

  /**
   * Acknowledges an operation as accepted by the server.
   * Removes from pending queue and schedules debounced storage sync.
   */
  public acknowledge(operationId: string): boolean {
    const initialLength = this.records.length;
    this.records = this.records.filter((r) => r.operation.operationId !== operationId);
    const removed = this.records.length !== initialLength;
    if (removed) {
      this.schedulePersist();
    }
    return removed;
  }

  /**
   * Rejects an operation (e.g. malformed or invalid).
   * Removes from pending queue and storage to avoid infinite retries.
   */
  public reject(operationId: string): boolean {
    return this.acknowledge(operationId);
  }

  /**
   * Reconciles the local pending queue with server canonical operation IDs upon SYNC_STATE.
   * - Drops operations already accepted by server.
   * - Returns operations that still need to be replayed.
   */
  public reconcileWithCanonical(canonicalOpIds: Set<string>): CollaborativeOperation[] {
    const remaining: PendingOperationRecord[] = [];
    const opsToReplay: CollaborativeOperation[] = [];

    for (const record of this.records) {
      if (canonicalOpIds.has(record.operation.operationId)) {
        // Already canonical on server: acknowledge and discard from queue
        continue;
      }
      // Not yet on server: needs replay
      record.status = 'pending';
      remaining.push(record);
      opsToReplay.push(record.operation);
    }

    this.records = remaining;
    this.persistImmediate();
    return opsToReplay;
  }

  /**
   * Returns all pending operations in chronological order.
   */
  public getPendingOperations(): CollaborativeOperation[] {
    return this.records.map((r) => r.operation);
  }

  /**
   * Returns current pending operations count.
   */
  public getPendingCount(): number {
    return this.records.length;
  }

  /**
   * Clears all pending operations for this room and session.
   */
  public clear(): void {
    this.records = [];
    this.persistImmediate();
  }

  /**
   * Flushes any pending debounced writes and removes window listeners.
   */
  public destroy(): void {
    this.persistImmediate();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }
}
