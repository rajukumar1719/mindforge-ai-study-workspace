/**
 * SyncDraw Security — Server-Side Token-Bucket Rate Limiter
 *
 * Provides ultra-lightweight, memory-safe O(1) rate limiting per connected socket.
 * Protects the WebSocket gateway against event flooding and Denial-of-Service attacks
 * without introducing bottlenecks or noticeable latency for legitimate collaborators.
 */

export type RateLimitedEvent = 'cursor' | 'drawUpdate' | 'operation' | 'joinRoom';

interface TokenBucketConfig {
  capacity: number;          // Maximum burst tokens allowed
  refillRatePerSec: number;  // Continuous tokens refilled per second
}

const RATE_LIMIT_CONFIGS: Record<RateLimitedEvent, TokenBucketConfig> = {
  // Cursor updates: client throttles to ~30ms (~33/sec). Limit 50/sec allows burstiness.
  cursor: {
    capacity: 50,
    refillRatePerSec: 50,
  },
  // Drawing point batches: normal drawing emits ~25-40 batches/sec. Limit 60/sec.
  drawUpdate: {
    capacity: 60,
    refillRatePerSec: 60,
  },
  // Operations (draw, erase, undo, redo): capacity 120 accommodates burst replays and duplicate checks (60/sec refill).
  operation: {
    capacity: 120,
    refillRatePerSec: 60,
  },
  // Room joins: prevents rapid-fire room allocation abuse (5 joins burst, 1/sec refill).
  joinRoom: {
    capacity: 5,
    refillRatePerSec: 1,
  },
};

interface SocketRateState {
  buckets: Record<RateLimitedEvent, { tokens: number; lastRefill: number }>;
  lastActivity: number;
}

export class SocketRateLimiter {
  private socketStates = new Map<string, SocketRateState>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodic garbage collection for inactive rate-limit records (every 60s)
    this.cleanupInterval = setInterval(() => {
      this.pruneStaleStates();
    }, 60000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Attempts to consume one token for the specified event type on a socket.
   * Returns true if allowed, false if rate limited.
   */
  public consume(socketId: string, event: RateLimitedEvent): boolean {
    const now = Date.now();
    let state = this.socketStates.get(socketId);

    if (!state) {
      state = this.initSocketState(now);
      this.socketStates.set(socketId, state);
    }

    state.lastActivity = now;
    const bucket = state.buckets[event];
    const config = RATE_LIMIT_CONFIGS[event];

    // Refill tokens based on elapsed time since last check
    const elapsedMs = now - bucket.lastRefill;
    if (elapsedMs > 0) {
      const tokensToAdd = (elapsedMs / 1000) * config.refillRatePerSec;
      bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check availability
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Completely cleans up rate limit tracking for a disconnected socket.
   */
  public clearSocket(socketId: string): void {
    this.socketStates.delete(socketId);
  }

  /**
   * Returns current tracked socket count for diagnostics and tests.
   */
  public getTrackedSocketCount(): number {
    return this.socketStates.size;
  }

  /**
   * Prunes records inactive for more than 2 minutes.
   */
  private pruneStaleStates(): void {
    const now = Date.now();
    const expiry = 120000; // 2 minutes

    for (const [socketId, state] of this.socketStates.entries()) {
      if (now - state.lastActivity > expiry) {
        this.socketStates.delete(socketId);
      }
    }
  }

  private initSocketState(now: number): SocketRateState {
    const buckets = {} as SocketRateState['buckets'];
    for (const [key, cfg] of Object.entries(RATE_LIMIT_CONFIGS)) {
      buckets[key as RateLimitedEvent] = {
        tokens: cfg.capacity,
        lastRefill: now,
      };
    }
    return {
      buckets,
      lastActivity: now,
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.socketStates.clear();
  }
}

export const socketRateLimiter = new SocketRateLimiter();
