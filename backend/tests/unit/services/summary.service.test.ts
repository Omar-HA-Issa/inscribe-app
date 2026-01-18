import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_DOCUMENT_ID, TEST_USER_ID } from '../../mocks/fixtures';

// Create mock functions
const mockChatCreate = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockSupabaseUpdate = vi.fn();

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: (...args: any[]) => mockChatCreate(...args),
      },
    };
  },
}));

// Mock Supabase client
vi.mock('../../../src/core/clients/supabaseClient', () => ({
  adminClient: () => ({
    from: mockSupabaseFrom,
  }),
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
import { generateDocumentSummary, getSummary } from '../../../src/core/services/summary.service';

describe('SummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chainable mock
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
    });
    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      order: mockSupabaseOrder,
    });
    mockSupabaseOrder.mockReturnValue({
      order: mockSupabaseOrder,
    });
    mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  describe('generateDocumentSummary', () => {
    it('should throw error when document not found', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Document not found' },
      });

      await expect(generateDocumentSummary(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('Document not found or access denied');
    });

    it('should return existing summary if available', async () => {
      const existingSummary = {
        overview: 'Test overview',
        keyFindings: ['finding1'],
        keywords: ['keyword1'],
        metadata: { wordCount: 100 },
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { summary: JSON.stringify(existingSummary) },
        error: null,
      });

      const result = await generateDocumentSummary(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result).toEqual(existingSummary);
      expect(mockChatCreate).not.toHaveBeenCalled();
    });

    it('should throw error when no chunks found', async () => {
      // First call: document found without summary
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: TEST_DOCUMENT_ID },
        error: null,
      });

      // Second call: chunks query - no chunks
      mockSupabaseOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(generateDocumentSummary(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('No document content found');
    });

    it('should throw error when chunks query fails', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: TEST_DOCUMENT_ID },
        error: null,
      });

      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(generateDocumentSummary(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('Database error');
    });

    it('should generate summary from chunks via OpenAI', async () => {
      const mockSummaryResponse = {
        overview: 'This is a generated overview.',
        keyFindings: ['Finding 1', 'Finding 2'],
        keywords: ['keyword1', 'keyword2'],
      };

      // Document found without summary
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: TEST_DOCUMENT_ID, metadata: { pages: 5 } },
        error: null,
      });

      // Chunks found
      mockSupabaseOrder.mockResolvedValue({
        data: [
          { content: 'Chunk 1 content here.', chunk_index: 0 },
          { content: 'Chunk 2 content here.', chunk_index: 1 },
        ],
        error: null,
      });

      // OpenAI response
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockSummaryResponse) } }],
      });

      const result = await generateDocumentSummary(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.overview).toBe(mockSummaryResponse.overview);
      expect(result.keyFindings).toEqual(mockSummaryResponse.keyFindings);
      expect(result.keywords).toEqual(mockSummaryResponse.keywords);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.pageCount).toBe(5);
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4o-mini',
      }));
    });

    it('should throw error when OpenAI returns no response', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: TEST_DOCUMENT_ID },
        error: null,
      });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Test content', chunk_index: 0 }],
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(generateDocumentSummary(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('No response from OpenAI');
    });

    it('should handle invalid existing summary JSON', async () => {
      // Document with invalid JSON summary
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: TEST_DOCUMENT_ID, summary: 'invalid json' },
        error: null,
      });

      // Chunks found
      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Test content', chunk_index: 0 }],
        error: null,
      });

      const mockSummaryResponse = {
        overview: 'Regenerated overview',
        keyFindings: [],
        keywords: [],
      };

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockSummaryResponse) } }],
      });

      const result = await generateDocumentSummary(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.overview).toBe(mockSummaryResponse.overview);
    });
  });

  describe('getSummary', () => {
    it('should return existing summary without regenerating', async () => {
      const existingSummary = {
        overview: 'Cached overview',
        keyFindings: ['cached finding'],
        keywords: ['cached keyword'],
        metadata: {},
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { summary: JSON.stringify(existingSummary) },
        error: null,
      });

      const result = await getSummary(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result).toEqual(existingSummary);
    });

    it('should generate new summary when forceRegenerate is true', async () => {
      const existingSummary = {
        overview: 'Old overview',
        keyFindings: [],
        keywords: [],
        metadata: {},
      };

      // First call returns existing summary (should be skipped due to forceRegenerate)
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'New content', chunk_index: 0 }],
        error: null,
      });

      const newSummary = {
        overview: 'New overview',
        keyFindings: ['new finding'],
        keywords: ['new keyword'],
      };

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(newSummary) } }],
      });

      const result = await getSummary(TEST_DOCUMENT_ID, TEST_USER_ID, true);

      expect(result.overview).toBe(newSummary.overview);
    });

    it('should generate summary when no existing summary', async () => {
      // No existing summary
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: { summary: null },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Document content', chunk_index: 0 }],
        error: null,
      });

      const generatedSummary = {
        overview: 'Generated overview',
        keyFindings: [],
        keywords: [],
      };

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(generatedSummary) } }],
      });

      const result = await getSummary(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.overview).toBe(generatedSummary.overview);
    });
  });
});
