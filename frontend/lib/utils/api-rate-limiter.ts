/**
 * API Rate Limiter
 * Prevents excessive API calls and implements intelligent caching and throttling
 */

import { useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  cacheTtl?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

interface RequestEntry {
  timestamp: number;
  count: number;
}

class APIRateLimiter {
  private static instance: APIRateLimiter;
  private requestCounts: Map<string, RequestEntry> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private constructor() {
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  static getInstance(): APIRateLimiter {
    if (!APIRateLimiter.instance) {
      APIRateLimiter.instance = new APIRateLimiter();
    }
    return APIRateLimiter.instance;
  }

  /**
   * Check if request should be allowed
   */
  canMakeRequest(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.requestCounts.get(key);

    if (!entry) {
      this.requestCounts.set(key, { timestamp: now, count: 1 });
      return true;
    }

    // Reset window if expired
    if (now - entry.timestamp > config.windowMs) {
      this.requestCounts.set(key, { timestamp: now, count: 1 });
      return true;
    }

    // Check if within limits
    if (entry.count < config.maxRequests) {
      entry.count++;
      return true;
    }

    return false;
  }

  /**
   * Get cached data if available and not expired
   */
  getCachedData(key: string, ttl: number = 300000): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache response data
   */
  setCachedData(key: string, data: any, etag?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag
    });
  }

  /**
   * Execute API request with rate limiting and caching
   */
  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    config: RateLimitConfig = { maxRequests: 10, windowMs: 60000, cacheTtl: 300000 }
  ): Promise<T> {
    // Check cache first
    const cached = this.getCachedData(key, config.cacheTtl);
    if (cached) {
      console.log(`API Cache Hit: ${key}`);
      return cached;
    }

    // Check for pending request (request deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`API Request Deduplication: ${key}`);
      return pending;
    }

    // Check rate limits
    if (!this.canMakeRequest(key, config)) {
      console.warn(`API Rate Limit Exceeded: ${key}`);
      throw new Error(`Rate limit exceeded for ${key}. Please try again later.`);
    }

    // Execute request
    const requestPromise = requestFn()
      .then(response => {
        this.setCachedData(key, response);
        return response;
      })
      .catch(error => {
        console.error(`API Request Failed: ${key}`, error);
        throw error;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Clean request counts
    for (const [key, entry] of this.requestCounts.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.requestCounts.delete(key);
      }
    }

    // Clean cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): {
    requestCounts: number;
    cacheEntries: number;
    pendingRequests: number;
  } {
    return {
      requestCounts: this.requestCounts.size,
      cacheEntries: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// Export singleton instance
export const apiRateLimiter = APIRateLimiter.getInstance();

/**
 * Higher-order function to wrap API calls with rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  config?: RateLimitConfig
): T {
  return ((...args: Parameters<T>) => {
    return apiRateLimiter.executeRequest(
      `${key}-${JSON.stringify(args)}`,
      () => fn(...args),
      config
    );
  }) as T;
}

/**
 * React hook for rate-limited API calls
 */
export function useRateLimitedAPI<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  config?: RateLimitConfig
): T {
  const rateLimitedFn = useRef(withRateLimit(fn, key, config));
  
  return useCallback(rateLimitedFn.current, []) as T;
}

/**
 * Batch API requests to reduce server load
 */
export class APIBatcher {
  private batches: Map<string, {
    requests: Array<{
      args: any[];
      resolve: (value: any) => void;
      reject: (error: any) => void;
    }>;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(private batchDelay: number = 100) {}

  /**
   * Add request to batch
   */
  batchRequest<T>(
    key: string,
    args: any[],
    batchFn: (batchedArgs: any[][]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(key);
      
      if (!batch) {
        batch = {
          requests: [],
          timeout: setTimeout(() => {
            this.executeBatch(key, batchFn);
          }, this.batchDelay)
        };
        this.batches.set(key, batch);
      }

      batch.requests.push({ args, resolve, reject });
    });
  }

  /**
   * Execute batched requests
   */
  private async executeBatch<T>(
    key: string,
    batchFn: (batchedArgs: any[][]) => Promise<T[]>
  ): Promise<void> {
    const batch = this.batches.get(key);
    if (!batch) return;

    this.batches.delete(key);
    clearTimeout(batch.timeout);

    try {
      const batchedArgs = batch.requests.map(req => req.args);
      const results = await batchFn(batchedArgs);
      
      batch.requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      batch.requests.forEach(req => {
        req.reject(error);
      });
    }
  }
}

export const apiBatcher = new APIBatcher();
