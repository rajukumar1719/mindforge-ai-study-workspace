/**
 * Lightweight in-memory rate limiter middleware.
 * Designed for single-instance demo / production deployment on Render.
 */
class RateLimiter {
  constructor(windowMs = 10 * 60 * 1000, maxRequests = 20) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.clients = new Map();

    // Clean up stale entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.clients.entries()) {
      if (now - data.windowStart > this.windowMs) {
        this.clients.delete(ip);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      // Extract client IP (handle proxies on Render/Vercel)
      const forwarded = req.headers["x-forwarded-for"];
      const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress) || "unknown";

      const now = Date.now();
      let record = this.clients.get(ip);

      if (!record || now - record.windowStart > this.windowMs) {
        record = { count: 1, windowStart: now };
        this.clients.set(ip, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetTime = record.windowStart + this.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      res.setHeader("X-RateLimit-Limit", this.maxRequests);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000));

      if (record.count > this.maxRequests) {
        res.setHeader("Retry-After", retryAfterSeconds);
        return res.status(429).json({
          error: "Rate limit exceeded. Too many requests. Please wait a moment before generating another session.",
          retryAfterSeconds
        });
      }

      next();
    };
  }
}

export const studyRateLimiter = new RateLimiter(10 * 60 * 1000, 20).middleware();
