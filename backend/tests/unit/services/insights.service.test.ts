import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_DOCUMENT_ID, TEST_USER_ID } from '../../mocks/fixtures';

// Create mock functions at module level
const mockChatCreate = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockSupabaseIn = vi.fn();
const mockSupabaseUpsert = vi.fn();

// Mock OpenAI - use arrow function wrapper to avoid hoisting issues
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: (...args: any[]) => mockChatCreate(...args),
      },
    };
  },
}));

// Mock Supabase createClient - use arrow function wrapper
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: any[]) => mockSupabaseFrom(...args),
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
import {
  generateDocumentInsights,
  generateCrossDocumentInsights,
} from '../../../src/core/services/insights.service';

describe('InsightsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chainable mock
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      upsert: mockSupabaseUpsert,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      in: mockSupabaseIn,
    });
    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      order: mockSupabaseOrder,
    });
    mockSupabaseIn.mockReturnValue({
      eq: mockSupabaseEq,
    });
    mockSupabaseOrder.mockReturnValue({
      data: [],
      error: null,
    });
    mockSupabaseUpsert.mockResolvedValue({ error: null });
  });

  describe('generateDocumentInsights', () => {
    it('should return cached insights when available and fresh', async () => {
      const cachedInsights = [
        {
          title: 'Cached Insight',
          description: 'Test description',
          confidence: 'High',
          category: 'pattern',
          evidence: ['Evidence 1'],
          impact: 'Test impact',
        },
      ];

      // Cached insights found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          insights: cachedInsights,
          created_at: new Date().toISOString(), // Fresh cache
        },
        error: null,
      });

      const result = await generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.cached).toBe(true);
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe('Cached Insight');
      expect(mockChatCreate).not.toHaveBeenCalled();
    });

    it('should throw error when document not found', async () => {
      // No cache
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Document not found' },
        });

      await expect(generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('Document not found');
    });

    it('should throw error when chunks cannot be fetched', async () => {
      // No cache
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Chunks error' },
      });

      await expect(generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('Failed to fetch document chunks');
    });

    it('should generate insights via OpenAI', async () => {
      const mockInsights = [
        {
          title: 'Generated Insight',
          description: 'AI generated description',
          confidence: 'High',
          category: 'pattern',
          evidence: ['Evidence from AI'],
          impact: 'Impact statement',
        },
      ];

      // No cache
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [
          { content: 'Test content', chunk_index: 0 },
        ],
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockInsights) } }],
      });

      const result = await generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.cached).toBe(false);
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe('Generated Insight');
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4o',
      }));
    });

    it('should filter out correlation category from insights', async () => {
      const mockInsights = [
        { title: 'Good Insight', category: 'pattern', description: '', confidence: 'High', evidence: [], impact: '' },
        { title: 'Bad Insight', category: 'correlation', description: '', confidence: 'High', evidence: [], impact: '' },
      ];

      // No cache
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Test', chunk_index: 0 }],
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockInsights) } }],
      });

      const result = await generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe('Good Insight');
    });

    it('should regenerate insights when forceRegenerate is true', async () => {
      const cachedInsights = [
        { title: 'Cached', category: 'pattern', description: '', confidence: 'High', evidence: [], impact: '' },
      ];
      const newInsights = [
        { title: 'New', category: 'anomaly', description: '', confidence: 'High', evidence: [], impact: '' },
      ];

      // Cache exists but we skip it
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: { insights: cachedInsights, created_at: new Date().toISOString() },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Content', chunk_index: 0 }],
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(newInsights) } }],
      });

      const result = await generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID, true);

      expect(result.insights[0].title).toBe('New');
      expect(mockChatCreate).toHaveBeenCalled();
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const mockInsights = [
        { title: 'Test', category: 'pattern', description: '', confidence: 'High', evidence: [], impact: '' },
      ];

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Content', chunk_index: 0 }],
        error: null,
      });

      // Response wrapped in markdown code block
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: '```json\n' + JSON.stringify(mockInsights) + '\n```' } }],
      });

      const result = await generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.insights).toHaveLength(1);
    });

    it('should handle insights object with insights array property', async () => {
      const mockResponse = {
        insights: [
          { title: 'Nested', category: 'risk', description: '', confidence: 'High', evidence: [], impact: '' },
        ],
      };

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Content', chunk_index: 0 }],
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      const result = await generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe('Nested');
    });

    it('should return empty insights array on invalid JSON', async () => {
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
          error: null,
        });

      mockSupabaseOrder.mockResolvedValue({
        data: [{ content: 'Content', chunk_index: 0 }],
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: 'invalid json {' } }],
      });

      const result = await generateDocumentInsights(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.insights).toEqual([]);
    });
  });

  describe('generateCrossDocumentInsights', () => {
    it('should return empty insights for empty document list', async () => {
      const result = await generateCrossDocumentInsights([], TEST_USER_ID);

      expect(result.insights).toEqual([]);
      expect(result.documentCount).toBe(0);
      expect(mockChatCreate).not.toHaveBeenCalled();
    });

    it('should return empty insights when no documents found', async () => {
      mockSupabaseEq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await generateCrossDocumentInsights([TEST_DOCUMENT_ID], TEST_USER_ID);

      expect(result.insights).toEqual([]);
      expect(result.documentCount).toBe(0);
    });

    it('should throw error when fetching documents fails', async () => {
      mockSupabaseEq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(generateCrossDocumentInsights([TEST_DOCUMENT_ID], TEST_USER_ID))
        .rejects.toThrow('Failed to fetch documents');
    });

    it('should generate cross-document insights', async () => {
      const mockDocs = [
        { id: 'doc-1', file_name: 'Doc1.pdf', metadata: {} },
        { id: 'doc-2', file_name: 'Doc2.pdf', metadata: {} },
      ];

      const mockInsights = [
        {
          title: 'Cross-doc Insight',
          description: 'Found across documents',
          confidence: 'High',
          category: 'pattern',
          evidence: ['Doc 1 evidence', 'Doc 2 evidence'],
          impact: 'Cross-document impact',
        },
      ];

      // First call gets docs list, subsequent calls get summaries
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: { summary: JSON.stringify({ overview: 'Doc 1 summary' }) }, error: null })
        .mockResolvedValueOnce({ data: { summary: JSON.stringify({ overview: 'Doc 2 summary' }) }, error: null });

      mockSupabaseEq.mockResolvedValueOnce({ data: mockDocs, error: null });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockInsights) } }],
      });

      const result = await generateCrossDocumentInsights(['doc-1', 'doc-2'], TEST_USER_ID);

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe('Cross-doc Insight');
      expect(result.documentCount).toBe(2);
    });

    it('should handle documents with string summaries', async () => {
      const mockDocs = [
        { id: 'doc-1', file_name: 'Doc1.pdf', metadata: {} },
      ];

      mockSupabaseSingle.mockResolvedValueOnce({ data: { summary: 'Plain text summary' }, error: null });
      mockSupabaseEq.mockResolvedValueOnce({ data: mockDocs, error: null });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: '[]' } }],
      });

      const result = await generateCrossDocumentInsights(['doc-1'], TEST_USER_ID);

      expect(result.documentCount).toBe(1);
    });

    it('should continue when summary fetch fails for a document', async () => {
      const mockDocs = [
        { id: 'doc-1', file_name: 'Doc1.pdf', metadata: {} },
        { id: 'doc-2', file_name: 'Doc2.pdf', metadata: {} },
      ];

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: { message: 'Summary error' } })
        .mockResolvedValueOnce({ data: { summary: JSON.stringify({ overview: 'Doc 2 overview' }) }, error: null });

      mockSupabaseEq.mockResolvedValueOnce({ data: mockDocs, error: null });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: '[]' } }],
      });

      const result = await generateCrossDocumentInsights(['doc-1', 'doc-2'], TEST_USER_ID);

      expect(result.documentCount).toBe(2);
    });
  });
});
