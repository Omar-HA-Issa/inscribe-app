import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../../shared/errors';
import { RATE_LIMIT_CONFIG } from '../../shared/constants/config';
import { logger } from '../../shared/utils/logger';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

/**
 * In-memory rate limiter following industry standards
 * Can be replaced with Redis-based limiter for production
 */
class RateLimiter {
  private store: RateLimitStore = {};

  private getClientKey(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of Object.entries(this.store)) {
      if (data.resetTime < now) {
        delete this.store[key];
      }
    }
  }

  isAllowed(req: Request, maxRequests: number): boolean {
    this.cleanup();

    const clientKey = this.getClientKey(req);
    const now = Date.now();

    if (!this.store[clientKey]) {
      this.store[clientKey] = { count: 1, resetTime: now + RATE_LIMIT_CONFIG.WINDOW_MS };
      return true;
    }

    const data = this.store[clientKey];

    // Reset window if expired
    if (data.resetTime <= now) {
      data.count = 1;
      data.resetTime = now + RATE_LIMIT_CONFIG.WINDOW_MS;
      return true;
    }

    // Check if limit exceeded before incrementing
    if (data.count >= maxRequests) {
      return false;
    }

    data.count++;
    return true;
  }
}

const limiter = new RateLimiter();

/**
 * Create rate limit middleware for a specific endpoint
 */
export const createRateLimiter = (maxRequests: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!limiter.isAllowed(req, maxRequests)) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      throw new TooManyRequestsError(
        `Rate limit exceeded. Maximum ${maxRequests} requests per 15 minutes`
      );
    }
    next();
  };
};

export const rateLimitMiddleware = {
  default: createRateLimiter(RATE_LIMIT_CONFIG.MAX_REQUESTS.DEFAULT),
  upload: createRateLimiter(RATE_LIMIT_CONFIG.MAX_REQUESTS.UPLOAD),
  chat: createRateLimiter(RATE_LIMIT_CONFIG.MAX_REQUESTS.CHAT),
  auth: createRateLimiter(RATE_LIMIT_CONFIG.MAX_REQUESTS.AUTH),
};
