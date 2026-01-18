import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { TEST_USER_ID, TEST_DOCUMENT_ID } from '../mocks/fixtures';

// Mock insights service
const mockGenerateDocumentInsights = vi.fn();
const mockGenerateCrossDocumentInsights = vi.fn();

vi.mock('../../src/core/services/insights.service', () => ({
  generateDocumentInsights: (...args: any[]) => mockGenerateDocumentInsights(...args),
  generateCrossDocumentInsights: (...args: any[]) => mockGenerateCrossDocumentInsights(...args),
}));

// Mock Supabase
vi.mock('../../src/core/clients/supabaseClient', () => ({
  adminClient: () => ({}),
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

describe('Insights Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/insights/document/:documentId', () => {
    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .post('/api/insights/document/invalid-uuid')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return insights for valid document', async () => {
      const mockInsights = {
        insights: [
          { type: 'summary', content: 'Test insight' },
        ],
        cached: false,
      };

      mockGenerateDocumentInsights.mockResolvedValue(mockInsights);

      const response = await request(app)
        .post(`/api/insights/document/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.insights).toBeDefined();
    });

    it('should pass forceRegenerate flag to service', async () => {
      mockGenerateDocumentInsights.mockResolvedValue({ insights: [] });

      await request(app)
        .post(`/api/insights/document/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token')
        .send({ forceRegenerate: true });

      expect(mockGenerateDocumentInsights).toHaveBeenCalledWith(
        TEST_DOCUMENT_ID,
        TEST_USER_ID,
        true
      );
    });

    it('should default forceRegenerate to false', async () => {
      mockGenerateDocumentInsights.mockResolvedValue({ insights: [] });

      await request(app)
        .post(`/api/insights/document/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token');

      expect(mockGenerateDocumentInsights).toHaveBeenCalledWith(
        TEST_DOCUMENT_ID,
        TEST_USER_ID,
        false
      );
    });
  });

  describe('POST /api/insights/cross-document', () => {
    it('should return 400 when documentIds is missing', async () => {
      const response = await request(app)
        .post('/api/insights/cross-document')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('non-empty array');
    });

    it('should return 400 when documentIds is empty array', async () => {
      const response = await request(app)
        .post('/api/insights/cross-document')
        .set('Authorization', 'Bearer test-token')
        .send({ documentIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('non-empty array');
    });

    it('should return 400 for invalid document ID in array', async () => {
      const response = await request(app)
        .post('/api/insights/cross-document')
        .set('Authorization', 'Bearer test-token')
        .send({ documentIds: ['invalid-uuid'] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return cross-document insights', async () => {
      const mockInsights = {
        insights: [
          { type: 'comparison', content: 'Cross-doc insight' },
        ],
        cached: false,
      };

      mockGenerateCrossDocumentInsights.mockResolvedValue(mockInsights);

      const response = await request(app)
        .post('/api/insights/cross-document')
        .set('Authorization', 'Bearer test-token')
        .send({
          documentIds: [TEST_DOCUMENT_ID, '550e8400-e29b-41d4-a716-446655440001'],
        });

      expect(response.status).toBe(200);
      expect(response.body.insights).toBeDefined();
    });

    it('should pass forceRegenerate to service', async () => {
      mockGenerateCrossDocumentInsights.mockResolvedValue({ insights: [] });

      const docIds = [TEST_DOCUMENT_ID, '550e8400-e29b-41d4-a716-446655440001'];

      await request(app)
        .post('/api/insights/cross-document')
        .set('Authorization', 'Bearer test-token')
        .send({
          documentIds: docIds,
          forceRegenerate: true,
        });

      expect(mockGenerateCrossDocumentInsights).toHaveBeenCalledWith(
        docIds,
        TEST_USER_ID,
        true
      );
    });
  });
});
