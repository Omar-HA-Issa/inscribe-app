import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { TEST_USER_ID, TEST_DOCUMENT_ID } from '../mocks/fixtures';

// Mock validation service
const mockDetectWithinDocument = vi.fn();
const mockDetectAcrossDocuments = vi.fn();

vi.mock('../../src/core/services/validation.service', () => ({
  detectWithinDocument: (...args: any[]) => mockDetectWithinDocument(...args),
  detectAcrossDocuments: (...args: any[]) => mockDetectAcrossDocuments(...args),
  validateDocumentIsTechnical: vi.fn(),
  clearAnalysisCache: vi.fn(),
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseMaybeSingle = vi.fn();

vi.mock('../../src/core/clients/supabaseClient', () => ({
  adminClient: () => ({
    from: (...args: any[]) => mockSupabaseFrom(...args),
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

describe('Validation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
    });
    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      maybeSingle: mockSupabaseMaybeSingle,
    });
    mockSupabaseInsert.mockResolvedValue({ error: null });
    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq,
    });
  });

  // Note: Routes are mounted at /api/contradictions in server.ts
  describe('POST /api/contradictions/check-cache', () => {
    it('should return 400 when documentId is missing', async () => {
      const response = await request(app)
        .post('/api/contradictions/check-cache')
        .set('Authorization', 'Bearer test-token')
        .send({ validationType: 'within' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 when validationType is missing', async () => {
      const response = await request(app)
        .post('/api/contradictions/check-cache')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: TEST_DOCUMENT_ID });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .post('/api/contradictions/check-cache')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: 'invalid-uuid', validationType: 'within' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return hasCached true when cache exists for within type', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: { id: 'cached-id', created_at: '2024-01-01' },
        error: null,
      });

      const response = await request(app)
        .post('/api/contradictions/check-cache')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: TEST_DOCUMENT_ID, validationType: 'within' });

      expect(response.status).toBe(200);
      expect(response.body.hasCached).toBe(true);
    });

    it('should return hasCached false when no cache exists', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const response = await request(app)
        .post('/api/contradictions/check-cache')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: TEST_DOCUMENT_ID, validationType: 'within' });

      expect(response.status).toBe(200);
      expect(response.body.hasCached).toBe(false);
    });

    it('should return 400 for across type without compareDocumentIds', async () => {
      const response = await request(app)
        .post('/api/contradictions/check-cache')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: TEST_DOCUMENT_ID, validationType: 'across' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Compare document IDs');
    });
  });

  describe('POST /api/contradictions/analyze/within', () => {
    it('should return 400 when documentId is missing', async () => {
      const response = await request(app)
        .post('/api/contradictions/analyze/within')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .post('/api/contradictions/analyze/within')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: 'invalid-uuid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return cached validation when available', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          contradictions: [],
          gaps: [],
          agreements: [],
          key_claims: [],
          recommendations: [],
          risk_assessment: { overallRisk: 'low' },
          documents_analyzed: 1,
          total_chunks_reviewed: 10,
          created_at: '2024-01-01',
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/contradictions/analyze/within')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: TEST_DOCUMENT_ID });

      expect(response.status).toBe(200);
      expect(response.body.analysisMetadata.cached).toBe(true);
    });

    it('should call service when forceRegenerate is true', async () => {
      const mockResult = {
        contradictions: [],
        gaps: [],
        agreements: [],
        keyClaims: [],
        recommendations: [],
        riskAssessment: { overallRisk: 'low' },
        analysisMetadata: {
          documentsAnalyzed: 1,
          totalChunksReviewed: 5,
        },
      };

      mockDetectWithinDocument.mockResolvedValue(mockResult);
      mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
      mockSupabaseInsert.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/contradictions/analyze/within')
        .set('Authorization', 'Bearer test-token')
        .send({ documentId: TEST_DOCUMENT_ID, forceRegenerate: true });

      expect(response.status).toBe(200);
      expect(mockDetectWithinDocument).toHaveBeenCalledWith(TEST_DOCUMENT_ID, TEST_USER_ID);
    });
  });

  describe('POST /api/contradictions/analyze/across', () => {
    it('should return 400 when primaryDocumentId is missing', async () => {
      const response = await request(app)
        .post('/api/contradictions/analyze/across')
        .set('Authorization', 'Bearer test-token')
        .send({ compareDocumentIds: [TEST_DOCUMENT_ID] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 when compareDocumentIds is missing', async () => {
      const response = await request(app)
        .post('/api/contradictions/analyze/across')
        .set('Authorization', 'Bearer test-token')
        .send({ primaryDocumentId: TEST_DOCUMENT_ID });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 when compareDocumentIds is empty', async () => {
      const response = await request(app)
        .post('/api/contradictions/analyze/across')
        .set('Authorization', 'Bearer test-token')
        .send({ primaryDocumentId: TEST_DOCUMENT_ID, compareDocumentIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('At least one');
    });

    it('should return 400 for invalid primary document ID', async () => {
      const response = await request(app)
        .post('/api/contradictions/analyze/across')
        .set('Authorization', 'Bearer test-token')
        .send({
          primaryDocumentId: 'invalid-uuid',
          compareDocumentIds: [TEST_DOCUMENT_ID],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid compare document ID', async () => {
      const response = await request(app)
        .post('/api/contradictions/analyze/across')
        .set('Authorization', 'Bearer test-token')
        .send({
          primaryDocumentId: TEST_DOCUMENT_ID,
          compareDocumentIds: ['invalid-uuid'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Note: Service call tests with successful responses are covered in unit tests.
    // Integration tests focus on request validation and error handling.
  });
});
