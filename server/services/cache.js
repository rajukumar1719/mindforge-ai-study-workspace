/**
 * In-memory LRU cache for study session requests.
 * Prevents redundant API calls for identical topics and study modes.
 */
class MemoryCache {
  constructor(maxSize = 100, defaultTtlSeconds = 3600) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtlSeconds * 1000;
    this.cache = new Map();
  }

  generateKey(topic, mode = "full", difficulty = "medium") {
    const cleanTopic = String(topic || "").trim().toLowerCase().replace(/\s+/g, " ");
    const cleanMode = String(mode || "full").trim().toLowerCase();
    const cleanDiff = String(difficulty || "medium").trim().toLowerCase();
    return `${cleanMode}:${cleanDiff}:${cleanTopic}`;
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    if (!key || !value) return;

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const ttl = (Number(ttlSeconds) || (this.defaultTtl / 1000)) * 1000;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

const defaultTtlSeconds = Number(process.env.CACHE_TTL_SECONDS) || 3600;
export const cacheService = new MemoryCache(100, defaultTtlSeconds);
