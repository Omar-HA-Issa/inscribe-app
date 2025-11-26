import { CACHE_TTL } from '../../shared/constants/config';
import { logger } from '../../shared/utils/logger';

/**
 * CacheService
 * Generic in-memory cache with TTL support
 * For production, replace with Redis
 * Follows Single Responsibility Principle
 */
export class CacheService<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();
  private maxSize: number;

  constructor(maxSize: number = CACHE_TTL.MAX_SIZE) {
    this.maxSize = maxSize;
  }

  /**
   * Set a value in cache with TTL
   */
  set(key: string, value: T, ttlMs: number): void {
    // Enforce size limit using LRU-like eviction (remove oldest)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      logger.debug('Cache eviction due to size limit', { maxSize: this.maxSize });
    }

    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
    logger.debug('Cache set', { key, ttl: `${ttlMs}ms` });
  }

  /**
   * Get a value from cache
   * Returns null if expired or not found
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug('Cache entry expired', { key });
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache entry deleted', { key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', { entriesCleared: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Get or compute value
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    logger.debug('Cache miss, computing value', { key });
    const value = await compute();
    this.set(key, value, ttlMs);
    return value;
  }
}

/**
 * Cache manager for specific analysis types
 */
export const analysisCache = new CacheService<any>(CACHE_TTL.MAX_SIZE);
export const summaryCache = new CacheService<any>(CACHE_TTL.MAX_SIZE);
export const insightsCache = new CacheService<any>(CACHE_TTL.MAX_SIZE);
