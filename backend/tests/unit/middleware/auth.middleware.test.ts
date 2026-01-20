import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../src/app/middleware/auth.middleware';
import { createMockRequest, createMockResponse, createMockNext, TEST_USER_ID, TEST_ACCESS_TOKEN } from '../../mocks/fixtures';

// Mock jose module
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

// Mock the supabase client
vi.mock('../../../src/core/clients/supabaseClient', () => ({
  userClient: vi.fn(() => ({ from: vi.fn() })),
}));

// Mock the logger
vi.mock('../../../src/shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { jwtVerify } from 'jose';

describe('Auth Middleware', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = createMockRequest() as Request;
    mockRes = createMockResponse() as unknown as Response;
    mockNext = createMockNext();
  });

  describe('requireAuth', () => {
    it('should return 401 when no authorization header is present', async () => {
      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated (no token)',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers = { authorization: 'Basic sometoken' };

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated (no token)',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Bearer token is empty', async () => {
      mockReq.headers = { authorization: 'Bearer ' };

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when token is valid', async () => {
      mockReq.headers = { authorization: `Bearer ${TEST_ACCESS_TOKEN}` };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: TEST_USER_ID },
        protectedHeader: { alg: 'HS256' },
      } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should set authUserId on request when token is valid', async () => {
      mockReq.headers = { authorization: `Bearer ${TEST_ACCESS_TOKEN}` };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: TEST_USER_ID },
        protectedHeader: { alg: 'HS256' },
      } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockReq.authUserId).toBe(TEST_USER_ID);
    });

    it('should set accessToken on request when token is valid', async () => {
      mockReq.headers = { authorization: `Bearer ${TEST_ACCESS_TOKEN}` };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: TEST_USER_ID },
        protectedHeader: { alg: 'HS256' },
      } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockReq.accessToken).toBe(TEST_ACCESS_TOKEN);
    });

    it('should set supabase client on request when token is valid', async () => {
      mockReq.headers = { authorization: `Bearer ${TEST_ACCESS_TOKEN}` };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: TEST_USER_ID },
        protectedHeader: { alg: 'HS256' },
      } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockReq.supabase).toBeDefined();
    });

    it('should return 401 when token verification fails', async () => {
      mockReq.headers = { authorization: `Bearer invalid-token` };

      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid signature'));

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token has no sub claim', async () => {
      mockReq.headers = { authorization: `Bearer ${TEST_ACCESS_TOKEN}` };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {}, // No sub claim
        protectedHeader: { alg: 'HS256' },
      } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token (no sub)',
      });
    });

    it('should try relaxed verification when strict verification fails', async () => {
      mockReq.headers = { authorization: `Bearer ${TEST_ACCESS_TOKEN}` };

      // First call (strict) fails, second call (relaxed) succeeds
      vi.mocked(jwtVerify)
        .mockRejectedValueOnce(new Error('Audience mismatch'))
        .mockResolvedValueOnce({
          payload: { sub: TEST_USER_ID },
          protectedHeader: { alg: 'HS256' },
        } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(jwtVerify).toHaveBeenCalledTimes(2);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle Authorization header with different case', async () => {
      // Express normalizes headers to lowercase, but the middleware also checks for uppercase
      // We test both authorization keys being present
      mockReq.headers = { authorization: `Bearer ${TEST_ACCESS_TOKEN}`, Authorization: `Bearer ${TEST_ACCESS_TOKEN}` };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: TEST_USER_ID },
        protectedHeader: { alg: 'HS256' },
      } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim whitespace from token', async () => {
      mockReq.headers = { authorization: `Bearer   ${TEST_ACCESS_TOKEN}   ` };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: TEST_USER_ID },
        protectedHeader: { alg: 'HS256' },
      } as any);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockReq.accessToken).toBe(TEST_ACCESS_TOKEN);
    });
  });
});
