import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { TEST_USER_ID, TEST_EMBEDDING } from '../mocks/fixtures';

// Mock EmbeddingService
const mockGenerateEmbeddings = vi.fn();

vi.mock('../../src/core/services/embedding.service', () => ({
  EmbeddingService: {
    generateEmbeddings: (...args: any[]) => mockGenerateEmbeddings(...args),
  },
}));

// Mock Supabase
const mockRpc = vi.fn();

vi.mock('../../src/core/clients/supabaseClient', () => ({
  adminClient: () => ({
    rpc: mockRpc,
  }),
  anonServerClient: () => ({}),
  clientFromRequest: () => ({}),
  extractBearerToken: () => null,
  userClient: () => ({}),
}));

// Mock auth middleware
vi.mock('../../src/app/middleware/auth.middleware', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.authUserId = TEST_USER_ID;
    next();
  },
}));

// Mock rate limiter
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

// Import after mocking
import app from '../../src/server';

describe('Search Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/search', () => {
    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when query is too short', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({ query: 'ab' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid topK', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({ query: 'search query', topK: 100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid minSimilarity', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({ query: 'search query', minSimilarity: 5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return search results for valid query', async () => {
      const mockResults = [
        { id: 'chunk-1', content: 'Result 1', similarity: 0.9 },
        { id: 'chunk-2', content: 'Result 2', similarity: 0.8 },
      ];

      mockGenerateEmbeddings.mockResolvedValue([TEST_EMBEDDING]);
      mockRpc.mockResolvedValue({
        data: mockResults,
        error: null,
      });

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({ query: 'what is this about?' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
    });

    it('should return empty results when no matches', async () => {
      mockGenerateEmbeddings.mockResolvedValue([TEST_EMBEDDING]);
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({ query: 'obscure query' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual([]);
    });

    it('should return 500 on RPC error', async () => {
      mockGenerateEmbeddings.mockResolvedValue([TEST_EMBEDDING]);
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({ query: 'search query' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should pass parameters to RPC call', async () => {
      mockGenerateEmbeddings.mockResolvedValue([TEST_EMBEDDING]);
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer test-token')
        .send({ query: 'search query', topK: 5, minSimilarity: 0.5 });

      expect(mockRpc).toHaveBeenCalledWith('match_document_chunks', {
        query_embedding: TEST_EMBEDDING,
        match_threshold: 0.5,
        match_count: 5,
        only_document_ids: null,
      });
    });
  });
});
