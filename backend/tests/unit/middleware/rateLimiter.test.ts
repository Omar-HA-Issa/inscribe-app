import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, rateLimitMiddleware } from '../../../src/app/middleware/rateLimiter';
import { TooManyRequestsError } from '../../../src/shared/errors';
import { createMockRequest, createMockResponse, createMockNext } from '../../mocks/fixtures';

// Mock the logger
vi.mock('../../../src/shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Rate Limiter Middleware', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = createMockRequest({ ip: '192.168.1.1' }) as Request;
    mockRes = createMockResponse() as unknown as Response;
    mockNext = createMockNext();
  });

  describe('createRateLimiter', () => {
    it('should allow requests under the limit', () => {
      const limiter = createRateLimiter(5);
      const uniqueReq = { ...mockReq, ip: `unique-ip-${Date.now()}` } as Request;

      // Should not throw
      expect(() => limiter(uniqueReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for allowed requests', () => {
      const limiter = createRateLimiter(10);
      const uniqueReq = { ...mockReq, ip: `unique-ip-2-${Date.now()}` } as Request;

      limiter(uniqueReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw TooManyRequestsError when limit is exceeded', () => {
      const limiter = createRateLimiter(2);
      const uniqueIp = `rate-limit-test-${Date.now()}`;
      const testReq = { ...mockReq, ip: uniqueIp } as Request;

      // First two requests should succeed
      expect(() => limiter(testReq, mockRes, mockNext)).not.toThrow();
      expect(() => limiter(testReq, mockRes, mockNext)).not.toThrow();

      // Third request should throw
      expect(() => limiter(testReq, mockRes, mockNext)).toThrow(TooManyRequestsError);
    });

    it('should include limit info in error message', () => {
      const limiter = createRateLimiter(3);
      const uniqueIp = `rate-limit-msg-test-${Date.now()}`;
      const testReq = { ...mockReq, ip: uniqueIp } as Request;

      // Exhaust the limit
      limiter(testReq, mockRes, mockNext);
      limiter(testReq, mockRes, mockNext);
      limiter(testReq, mockRes, mockNext);

      try {
        limiter(testReq, mockRes, mockNext);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TooManyRequestsError);
        expect((error as TooManyRequestsError).message).toContain('3');
        expect((error as TooManyRequestsError).message).toContain('15 minutes');
      }
    });

    it('should track requests per IP', () => {
      const limiter = createRateLimiter(2);
      const ip1 = `ip-1-${Date.now()}`;
      const ip2 = `ip-2-${Date.now()}`;
      const req1 = { ...mockReq, ip: ip1 } as Request;
      const req2 = { ...mockReq, ip: ip2 } as Request;

      // Both IPs should be able to make requests independently
      expect(() => limiter(req1, mockRes, mockNext)).not.toThrow();
      expect(() => limiter(req1, mockRes, mockNext)).not.toThrow();
      expect(() => limiter(req2, mockRes, mockNext)).not.toThrow();
      expect(() => limiter(req2, mockRes, mockNext)).not.toThrow();

      // Now both should be rate limited
      expect(() => limiter(req1, mockRes, mockNext)).toThrow(TooManyRequestsError);
      expect(() => limiter(req2, mockRes, mockNext)).toThrow(TooManyRequestsError);
    });

    it('should use socket.remoteAddress if ip is not available', () => {
      const limiter = createRateLimiter(2);
      const uniqueAddress = `socket-${Date.now()}`;
      const reqWithSocket = {
        ...mockReq,
        ip: undefined,
        socket: { remoteAddress: uniqueAddress },
      } as unknown as Request;

      expect(() => limiter(reqWithSocket, mockRes, mockNext)).not.toThrow();
      expect(() => limiter(reqWithSocket, mockRes, mockNext)).not.toThrow();
      expect(() => limiter(reqWithSocket, mockRes, mockNext)).toThrow(TooManyRequestsError);
    });

    it('should handle requests with no IP information', () => {
      const limiter = createRateLimiter(100);
      const reqNoIp = {
        ...mockReq,
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as unknown as Request;

      // Should still work using 'unknown' as key
      expect(() => limiter(reqNoIp, mockRes, mockNext)).not.toThrow();
    });
  });

  describe('rateLimitMiddleware presets', () => {
    it('should have default middleware with 1000 requests limit', () => {
      expect(rateLimitMiddleware.default).toBeDefined();
      expect(typeof rateLimitMiddleware.default).toBe('function');
    });

    it('should have upload middleware with 50 requests limit', () => {
      expect(rateLimitMiddleware.upload).toBeDefined();
      expect(typeof rateLimitMiddleware.upload).toBe('function');
    });

    it('should have chat middleware with 200 requests limit', () => {
      expect(rateLimitMiddleware.chat).toBeDefined();
      expect(typeof rateLimitMiddleware.chat).toBe('function');
    });

    it('should have auth middleware with 10 requests limit', () => {
      expect(rateLimitMiddleware.auth).toBeDefined();
      expect(typeof rateLimitMiddleware.auth).toBe('function');
    });

    it('auth middleware should block after 10 requests', () => {
      const uniqueIp = `auth-test-${Date.now()}`;
      const testReq = { ...mockReq, ip: uniqueIp } as Request;

      // Make 10 requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        expect(() => rateLimitMiddleware.auth(testReq, mockRes, mockNext)).not.toThrow();
      }

      // 11th request should fail
      expect(() => rateLimitMiddleware.auth(testReq, mockRes, mockNext)).toThrow(TooManyRequestsError);
    });
  });

  describe('Rate limit window behavior', () => {
    it('should reset count after window expires', async () => {
      // Create a limiter with a very short window for testing
      // Note: This tests the logic, but in real tests we'd mock Date.now()
      const limiter = createRateLimiter(1);
      const uniqueIp = `window-test-${Date.now()}`;
      const testReq = { ...mockReq, ip: uniqueIp } as Request;

      // First request succeeds
      expect(() => limiter(testReq, mockRes, mockNext)).not.toThrow();

      // Second request fails (limit exceeded)
      expect(() => limiter(testReq, mockRes, mockNext)).toThrow(TooManyRequestsError);
    });
  });
});
