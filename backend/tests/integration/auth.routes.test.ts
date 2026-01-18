import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { TEST_USER_ID, TEST_USER_EMAIL } from '../mocks/fixtures';

// Mock Supabase clients before importing app
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();

vi.mock('../../src/core/clients/supabaseClient', () => ({
  anonServerClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  }),
  clientFromRequest: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  extractBearerToken: (req: any) => {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth) return null;
    const parts = auth.split(' ');
    return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
  },
  adminClient: () => ({}),
  userClient: () => ({}),
}));

// Mock rate limiter to avoid rate limiting in tests
vi.mock('../../src/app/middleware/rateLimiter', () => ({
  rateLimitMiddleware: {
    auth: (req: any, res: any, next: any) => next(),
    default: (req: any, res: any, next: any) => next(),
    chat: (req: any, res: any, next: any) => next(),
    upload: (req: any, res: any, next: any) => next(),
  },
}));

// Mock logger
vi.mock('../../src/shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import app after mocking
import app from '../../src/server';

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/login', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email format');
    });

    it('should return 400 when login fails', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Note: Successful login tests are covered in unit tests for the auth service.
    // Integration tests focus on request validation and error handling.
  });

  describe('POST /api/signup', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/signup')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/signup')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email format');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/signup')
        .send({ email: 'test@example.com', password: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 6 characters');
    });

    it('should return 400 when signup fails', async () => {
      mockSignUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      });

      const response = await request(app)
        .post('/api/signup')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Note: Successful signup tests are covered in unit tests for the auth service.
    // Integration tests focus on request validation and error handling.
  });

  describe('POST /api/logout', () => {
    it('should return 200 on successful logout', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/me', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid token', async () => {
      mockGetUser.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return user data for valid token', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } },
        error: null,
      });

      const response = await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.id).toBe(TEST_USER_ID);
    });
  });
});
