import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabaseClient } from '../../mocks/supabase.mock';
import { TEST_DOCUMENT_ID, TEST_USER_ID } from '../../mocks/fixtures';

// Create mock functions
const mockSearchChunks = vi.fn();
const mockGetDocumentChunks = vi.fn();

// Mock the search service with a proper class
vi.mock('../../../src/core/services/search.service', () => ({
  SearchService: class MockSearchService {
    searchChunks = mockSearchChunks;
    getDocumentChunks = mockGetDocumentChunks;
  },
}));

// Mock the supabase client
vi.mock('../../../src/core/clients/supabaseClient', () => ({
  adminClient: vi.fn(),
  userClient: vi.fn(),
}));

// Mock the logger
vi.mock('../../../src/shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking
import { ChatService } from '../../../src/core/services/chat.service';
import { adminClient } from '../../../src/core/clients/supabaseClient';

describe('ChatService', () => {
  let mockSupabase: any;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    vi.mocked(adminClient).mockReturnValue(mockSupabase);

    // Save original fetch
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('chat', () => {
    it('should return no results message when no chunks found', async () => {
      mockSearchChunks.mockResolvedValue([]);

      const result = await ChatService.chat(
        'What is the main topic?',
        5,
        0.5,
        [TEST_DOCUMENT_ID],
        mockSupabase,
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.answer).toContain('could not find relevant information');
      expect(result.sources).toEqual([]);
      expect(result.chunksUsed).toBe(0);
    });

    it('should generate answer from found chunks', async () => {
      const mockChunks = [
        { document_id: TEST_DOCUMENT_ID, content: 'Chunk 1 content', similarity: 0.9 },
        { document_id: TEST_DOCUMENT_ID, content: 'Chunk 2 content', similarity: 0.8 },
      ];
      mockSearchChunks.mockResolvedValue(mockChunks);

      // Mock fetch for OpenAI API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'This is the AI-generated answer.' } }],
        }),
      });

      const result = await ChatService.chat(
        'What is the main topic?',
        5,
        0.5,
        [TEST_DOCUMENT_ID],
        mockSupabase,
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.answer).toBe('This is the AI-generated answer.');
      expect(result.chunksUsed).toBe(2);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].documentId).toBe(TEST_DOCUMENT_ID);
      expect(result.sources[0].chunksUsed).toBe(2);
    });

    it('should use default parameters when not provided', async () => {
      mockSearchChunks.mockResolvedValue([]);

      await ChatService.chat('Question');

      expect(mockSearchChunks).toHaveBeenCalledWith(
        'Question',
        6, // default topK
        0.15, // default similarity threshold
        undefined,
        expect.anything(),
        undefined
      );
    });

    it('should throw error when OpenAI API fails', async () => {
      const mockChunks = [
        { document_id: TEST_DOCUMENT_ID, content: 'Content', similarity: 0.9 },
      ];
      mockSearchChunks.mockResolvedValue(mockChunks);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' },
        }),
      });

      await expect(ChatService.chat('Question', 5, 0.5, [TEST_DOCUMENT_ID], mockSupabase))
        .rejects.toThrow('OpenAI API error');
    });

    it('should aggregate sources from multiple documents', async () => {
      const mockChunks = [
        { document_id: 'doc-1', content: 'Content 1', similarity: 0.9 },
        { document_id: 'doc-1', content: 'Content 2', similarity: 0.85 },
        { document_id: 'doc-2', content: 'Content 3', similarity: 0.8 },
      ];
      mockSearchChunks.mockResolvedValue(mockChunks);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Answer' } }],
        }),
      });

      const result = await ChatService.chat('Question', 5, 0.5);

      expect(result.sources).toHaveLength(2);
      const doc1Source = result.sources.find(s => s.documentId === 'doc-1');
      const doc2Source = result.sources.find(s => s.documentId === 'doc-2');
      expect(doc1Source?.chunksUsed).toBe(2);
      expect(doc2Source?.chunksUsed).toBe(1);
    });
  });

  describe('summarizeDocument', () => {
    it('should return message when no chunks found', async () => {
      mockGetDocumentChunks.mockResolvedValue([]);

      const result = await ChatService.summarizeDocument(TEST_DOCUMENT_ID, 30, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.summary).toBe('No content found in this document.');
      expect(result.chunksUsed).toBe(0);
    });

    it('should generate summary from document chunks', async () => {
      const mockChunks = [
        { content: 'First part of document.' },
        { content: 'Second part of document.' },
      ];
      mockGetDocumentChunks.mockResolvedValue(mockChunks);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'This is the document summary.' } }],
        }),
      });

      const result = await ChatService.summarizeDocument(TEST_DOCUMENT_ID, 30, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.summary).toBe('This is the document summary.');
      expect(result.chunksUsed).toBe(2);
    });

    it('should use default maxChunks when not provided', async () => {
      mockGetDocumentChunks.mockResolvedValue([]);

      await ChatService.summarizeDocument(TEST_DOCUMENT_ID);

      expect(mockGetDocumentChunks).toHaveBeenCalledWith(
        TEST_DOCUMENT_ID,
        30, // default maxChunks
        expect.anything()
      );
    });

    it('should throw error when summary generation fails', async () => {
      const mockChunks = [{ content: 'Document content.' }];
      mockGetDocumentChunks.mockResolvedValue(mockChunks);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'API error' },
        }),
      });

      await expect(ChatService.summarizeDocument(TEST_DOCUMENT_ID, 30, mockSupabase))
        .rejects.toThrow('OpenAI API error');
    });

    it('should handle missing response content', async () => {
      const mockChunks = [{ content: 'Document content.' }];
      mockGetDocumentChunks.mockResolvedValue(mockChunks);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: null } }],
        }),
      });

      const result = await ChatService.summarizeDocument(TEST_DOCUMENT_ID, 30, mockSupabase);

      expect(result.summary).toBe('Unable to generate summary');
    });
  });
});
