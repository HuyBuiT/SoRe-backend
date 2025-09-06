interface RateLimitTracker {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitTracker> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 60) { // 15 min window, 60 requests
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const tracker = this.limits.get(key);

    if (!tracker) {
      this.limits.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Check if window has expired
    if (now - tracker.windowStart >= this.windowMs) {
      tracker.count = 1;
      tracker.windowStart = now;
      return true;
    }

    // Check if we're under the limit
    if (tracker.count < this.maxRequests) {
      tracker.count++;
      return true;
    }

    return false;
  }

  getRemainingRequests(key: string): number {
    const tracker = this.limits.get(key);
    if (!tracker) return this.maxRequests;

    const now = Date.now();
    if (now - tracker.windowStart >= this.windowMs) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - tracker.count);
  }

  getResetTime(key: string): number {
    const tracker = this.limits.get(key);
    if (!tracker) return 0;

    return tracker.windowStart + this.windowMs;
  }
}