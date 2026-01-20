import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { TEST_USER_ID, TEST_DOCUMENT_ID } from '../mocks/fixtures';

// Mock ChatService
const mockChat = vi.fn();
const mockSummarizeDocument = vi.fn();

vi.mock('../../src/core/services/chat.service', () => ({
  ChatService: {
    chat: (...args: any[]) => mockChat(...args),
    summarizeDocument: (...args: any[]) => mockSummarizeDocument(...args),
  },
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

describe('Chat Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/chat', () => {
    it('should return 400 when question is missing', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when question is too short', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({ question: 'ab' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when question is too long', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({ question: 'a'.repeat(1001) });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid topK value', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({ question: 'What is this about?', topK: 100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid similarityThreshold', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({ question: 'What is this about?', similarityThreshold: 2 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid document ID in selectedDocumentIds', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({
          question: 'What is this about?',
          selectedDocumentIds: ['invalid-uuid'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return chat response for valid request', async () => {
      const mockResponse = {
        success: true,
        answer: 'This is the answer.',
        sources: [{ documentId: TEST_DOCUMENT_ID, chunksUsed: 2 }],
        chunksUsed: 2,
      };

      mockChat.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({ question: 'What is this document about?' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.answer).toBe('This is the answer.');
    });

    it('should pass parameters to ChatService', async () => {
      mockChat.mockResolvedValue({
        success: true,
        answer: 'Answer',
        sources: [],
        chunksUsed: 0,
      });

      await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer test-token')
        .send({
          question: 'What is this about?',
          selectedDocumentIds: [TEST_DOCUMENT_ID],
          topK: 10,
          similarityThreshold: 0.5,
        });

      expect(mockChat).toHaveBeenCalledWith(
        'What is this about?',
        10,
        0.5,
        [TEST_DOCUMENT_ID],
        expect.anything(),
        TEST_USER_ID
      );
    });
  });

  describe('POST /api/summarize/:documentId', () => {
    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .post('/api/summarize/invalid-uuid')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return summary for valid document', async () => {
      const mockSummary = {
        success: true,
        summary: 'This document is about...',
        chunksUsed: 5,
      };

      mockSummarizeDocument.mockResolvedValue(mockSummary);

      const response = await request(app)
        .post(`/api/summarize/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate maxChunks parameter', async () => {
      const response = await request(app)
        .post(`/api/summarize/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token')
        .send({ maxChunks: 200 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should pass maxChunks to service', async () => {
      mockSummarizeDocument.mockResolvedValue({
        success: true,
        summary: 'Summary',
        chunksUsed: 20,
      });

      await request(app)
        .post(`/api/summarize/${TEST_DOCUMENT_ID}`)
        .set('Authorization', 'Bearer test-token')
        .send({ maxChunks: 20 });

      expect(mockSummarizeDocument).toHaveBeenCalledWith(
        TEST_DOCUMENT_ID,
        20,
        expect.anything()
      );
    });
  });
});
