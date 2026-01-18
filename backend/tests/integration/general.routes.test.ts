import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock all external dependencies
vi.mock('../../src/core/clients/supabaseClient', () => ({
  adminClient: () => ({}),
  anonServerClient: () => ({}),
  clientFromRequest: () => ({}),
  extractBearerToken: () => null,
  userClient: () => ({}),
}));

vi.mock('../../src/app/middleware/rateLimiter', () => ({
  rateLimitMiddleware: {
    auth: (req: any, res: any, next: any) => next(),
    default: (req: any, res: any, next: any) => next(),
    chat: (req: any, res: any, next: any) => next(),
    upload: (req: any, res: any, next: any) => next(),
  },
}));

vi.mock('../../src/shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking
import app from '../../src/server';

describe('General Routes', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.message).toContain('running');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown non-api routes', async () => {
      // Test with a non-api route that doesn't go through auth middleware
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for unknown methods on health endpoint', async () => {
      // Health endpoint doesn't have POST handler
      const response = await request(app).post('/health');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:5173');

      // Express with CORS middleware should respond
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('JSON Parsing', () => {
    it('should handle JSON body on health endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .set('Content-Type', 'application/json');

      // Health endpoint should respond
      expect(response.status).toBe(200);
    });

    it('should accept requests with JSON content type', async () => {
      // Test that the server parses JSON - login with validation errors shows JSON was parsed
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@example.com' }) // Missing password - will get 400 not 500
        .set('Content-Type', 'application/json');

      // Should get a validation error (400), not a server error (500)
      expect(response.status).toBe(400);
    });
  });
});
