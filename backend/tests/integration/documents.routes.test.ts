import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { TEST_USER_ID, TEST_DOCUMENT_ID } from '../mocks/fixtures';

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockSupabaseUpsert = vi.fn();
const mockSupabaseLimit = vi.fn();
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

// Mock auth middleware to inject user ID
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

// Mock summary service
vi.mock('../../src/core/services/summary.service', () => ({
  getSummary: vi.fn(),
  generateDocumentSummary: vi.fn(),
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
import { getSummary } from '../../src/core/services/summary.service';

describe('Documents Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chainable mock
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      delete: mockSupabaseDelete,
      upsert: mockSupabaseUpsert,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
      limit: mockSupabaseLimit,
    });
    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
      single: mockSupabaseSingle,
      limit: mockSupabaseLimit,
      maybeSingle: mockSupabaseMaybeSingle,
    });
    mockSupabaseOrder.mockReturnValue({
      order: mockSupabaseOrder,
      limit: mockSupabaseLimit,
      data: [],
      error: null,
    });
    mockSupabaseLimit.mockReturnValue({
      maybeSingle: mockSupabaseMaybeSingle,
      data: [],
      error: null,
    });
    mockSupabaseDelete.mockReturnValue({
      eq: mockSupabaseEq,
    });
    mockSupabaseUpsert.mockResolvedValue({ error: null });
  });

  describe('GET /api/documents', () => {
    it('should return empty array when no documents', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.documents).toEqual([]);
    });

    it('should return list of documents', async () => {
      const mockDocuments = [
        { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', created_at: '2024-01-01' },
        { id: 'doc-2', file_name: 'test2.pdf', created_at: '2024-01-02' },
      ];

      mockSupabaseOrder.mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.documents).toHaveLength(2);
      expect(response.body.documents[0].id).toBe(TEST_DOCUMENT_ID);
    });

    it('should return 500 on database error', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/documents/:id/summary', () => {
    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .get('/api/documents/invalid-uuid/summary')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return summary for valid document', async () => {
      const mockSummary = {
        overview: 'Test overview',
        keyFindings: ['Finding 1'],
        keywords: ['keyword1'],
        metadata: { wordCount: 100 },
      };

      vi.mocked(getSummary).mockResolvedValue(mockSummary);

      const response = await request(app)
        .get(`/api/documents/${TEST_DOCUMENT_ID}/summary`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual(mockSummary);
    });

    it('should pass regenerate flag to service', async () => {
      vi.mocked(getSummary).mockResolvedValue({
        overview: 'Regenerated',
        keyFindings: [],
        keywords: [],
        metadata: {},
      });

      await request(app)
        .get(`/api/documents/${TEST_DOCUMENT_ID}/summary?regenerate=true`)
        .set('Authorization', 'Bearer test-token');

      expect(getSummary).toHaveBeenCalledWith(TEST_DOCUMENT_ID, TEST_USER_ID, true);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .delete('/api/documents/invalid-uuid')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should delete document and chunks successfully', async () => {
      // The delete chain: from().delete().eq() for chunks, then from().delete().eq().eq() for documents
      // Need to reset the mock chain for delete operations
      const mockDeleteEq = vi.fn();
      mockDeleteEq.mockResolvedValue({ error: null });

      mockSupabaseDelete.mockReturnValue({
        eq: mockDeleteEq,
      });
      mockDeleteEq.mockReturnValue({
        eq: mockDeleteEq,
      });

      const response = await request(app)
        .delete(`/api/documents/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 500 when chunk deletion fails', async () => {
      mockSupabaseEq.mockResolvedValueOnce({ error: { message: 'Deletion failed' } });

      const response = await request(app)
        .delete(`/api/documents/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/documents/:id/preferences', () => {
    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .post('/api/documents/invalid-uuid/preferences')
        .set('Authorization', 'Bearer test-token')
        .send({ enabledSections: ['summary'] });

      expect(response.status).toBe(400);
    });

    it('should save preferences successfully', async () => {
      mockSupabaseUpsert.mockResolvedValue({ error: null });

      const response = await request(app)
        .post(`/api/documents/${TEST_DOCUMENT_ID}/preferences`)
        .set('Authorization', 'Bearer test-token')
        .send({
          enabledSections: ['summary', 'insights'],
          hiddenInsights: [],
          hiddenValidationItems: [],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/documents/:id/preferences', () => {
    it('should return empty defaults when no preferences found', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const response = await request(app)
        .get(`/api/documents/${TEST_DOCUMENT_ID}/preferences`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.enabledSections).toEqual([]);
      expect(response.body.hiddenInsights).toEqual([]);
    });

    it('should return saved preferences', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          enabled_sections: ['summary'],
          hidden_insights: ['insight-1'],
          hidden_validation_items: [],
        },
        error: null,
      });

      const response = await request(app)
        .get(`/api/documents/${TEST_DOCUMENT_ID}/preferences`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.enabledSections).toEqual(['summary']);
      expect(response.body.hiddenInsights).toEqual(['insight-1']);
    });
  });
});
