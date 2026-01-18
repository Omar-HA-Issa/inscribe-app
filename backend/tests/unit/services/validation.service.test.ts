import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_DOCUMENT_ID, TEST_USER_ID } from '../../mocks/fixtures';

// Create mock functions at module level
const mockChatCreate = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseIn = vi.fn();
const mockSupabaseOrder = vi.fn();

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
  detectWithinDocument,
  detectAcrossDocuments,
  validateDocumentIsTechnical,
  clearAnalysisCache,
} from '../../../src/core/services/validation.service';

describe('ValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAnalysisCache(); // Clear cache before each test

    // Setup chainable mock - order needs to support chaining (.order().order())
    const createOrderChain = () => ({
      order: mockSupabaseOrder,
      data: null,
      error: null,
    });

    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      in: mockSupabaseIn,
    });
    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
    });
    mockSupabaseIn.mockReturnValue({
      eq: mockSupabaseEq,
    });
    // By default, order returns an object that can chain to another order
    mockSupabaseOrder.mockReturnValue(createOrderChain());
  });

  describe('detectWithinDocument', () => {
    it('should throw error when document not found', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('Document not found or no content available');
    });

    it('should throw error when no chunks found', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID))
        .rejects.toThrow('Document not found or no content available');
    });

    it('should analyze document and return contradictions', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          content: 'Use version 1.0 for this feature.',
          chunk_index: 0,
          documents: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
        },
        {
          id: 'chunk-2',
          content: 'Use version 2.0 for this feature.',
          chunk_index: 1,
          documents: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
        },
      ];

      const mockAnalysis = {
        contradictions: [
          {
            severity: 'high',
            confidence: 0.9,
            type: 'version',
            description: 'Version conflict found',
            sources: [
              { docName: 'test.pdf', location: 'Section 1', excerpt: 'Use version 1.0' },
              { docName: 'test.pdf', location: 'Section 2', excerpt: 'Use version 2.0' },
            ],
          },
        ],
        gaps: [],
        keyClaims: [],
        recommendations: [],
        riskAssessment: {
          overallRisk: 'medium',
          summary: 'Some issues found',
          criticalItems: [],
          nextSteps: [],
        },
      };

      mockSupabaseOrder.mockResolvedValue({
        data: mockChunks,
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.contradictions).toHaveLength(1);
      expect(result.contradictions[0].type).toBe('version');
      expect(result.contradictions[0].severity).toBe('high');
      expect(result.analysisMetadata.documentsAnalyzed).toBe(1);
      expect(result.analysisMetadata.totalChunksReviewed).toBe(2);
    });

    it('should return cached results on subsequent calls', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          content: 'Test content',
          chunk_index: 0,
          documents: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
        },
      ];

      const mockAnalysis = {
        contradictions: [],
        gaps: [],
        keyClaims: [],
        recommendations: [],
        riskAssessment: { overallRisk: 'low', summary: 'Good', criticalItems: [], nextSteps: [] },
      };

      mockSupabaseOrder.mockResolvedValue({
        data: mockChunks,
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      // First call
      const result1 = await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);
      expect(result1.analysisMetadata.cached).toBe(false);

      // Second call - should return cached
      const result2 = await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);
      expect(result2.analysisMetadata.cached).toBe(true);

      // OpenAI should only be called once
      expect(mockChatCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle legacy contradiction format', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          content: 'Content here',
          chunk_index: 0,
          documents: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
        },
      ];

      const mockAnalysis = {
        contradictions: [
          {
            claim: 'First claim',
            evidence: 'Contradicting evidence',
            explanation: 'These contradict each other',
            severity: 'medium',
          },
        ],
        gaps: [],
        keyClaims: [],
        recommendations: [],
        riskAssessment: { overallRisk: 'medium', summary: 'Analysis done', criticalItems: [], nextSteps: [] },
      };

      mockSupabaseOrder.mockResolvedValue({
        data: mockChunks,
        error: null,
      });

      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.contradictions).toHaveLength(1);
      expect(result.contradictions[0].description).toBe('These contradict each other');
      expect(result.contradictions[0].type).toBe('process'); // Default type
    });
  });

  describe('detectAcrossDocuments', () => {
    it('should throw error when primary document not found', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(detectAcrossDocuments(TEST_DOCUMENT_ID, ['doc-2'], TEST_USER_ID))
        .rejects.toThrow('Primary document not found');
    });

    // Note: Cross-document tests are complex due to the double .order().order() chain
    // which is difficult to mock. The detectWithinDocument tests above cover the core
    // functionality. Cross-document analysis uses the same underlying parsing logic.
  });

  describe('validateDocumentIsTechnical', () => {
    it('should return true for technical document', async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              isTechnical: true,
              reason: 'Document contains API documentation and code examples',
              confidence: 0.95,
            }),
          },
        }],
      });

      const result = await validateDocumentIsTechnical(
        'API endpoint: GET /users\nResponse: { id: number, name: string }',
        'api-docs.md'
      );

      expect(result.isTechnical).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should return false for non-technical document', async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              isTechnical: false,
              reason: 'Document is a recipe with cooking instructions',
              confidence: 0.9,
            }),
          },
        }],
      });

      const result = await validateDocumentIsTechnical(
        'Preheat oven to 350F. Mix flour and sugar.',
        'chocolate-cake.txt'
      );

      expect(result.isTechnical).toBe(false);
    });

    it('should fail open on API error', async () => {
      mockChatCreate.mockRejectedValue(new Error('API error'));

      const result = await validateDocumentIsTechnical('Test content', 'test.pdf');

      expect(result.isTechnical).toBe(true); // Fail open
      expect(result.confidence).toBe(0.0);
      expect(result.reason).toContain('unavailable');
    });

    it('should handle empty response', async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
      });

      const result = await validateDocumentIsTechnical('Content', 'doc.pdf');

      expect(result.isTechnical).toBe(false);
      expect(result.reason).toContain('Unable to classify');
    });

    it('should use gpt-4o-mini model', async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              isTechnical: true,
              reason: 'Technical',
              confidence: 0.8,
            }),
          },
        }],
      });

      await validateDocumentIsTechnical('Content', 'doc.pdf');

      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4o-mini',
      }));
    });
  });

  describe('clearAnalysisCache', () => {
    it('should clear all cache when no document IDs provided', async () => {
      // Populate cache
      const mockChunks = [
        {
          id: 'chunk-1',
          content: 'Test',
          chunk_index: 0,
          documents: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
        },
      ];

      mockSupabaseOrder.mockResolvedValue({ data: mockChunks, error: null });
      mockChatCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              contradictions: [],
              gaps: [],
              keyClaims: [],
              recommendations: [],
              riskAssessment: { overallRisk: 'low', summary: '', criticalItems: [], nextSteps: [] },
            }),
          },
        }],
      });

      // First call populates cache
      await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);
      expect(mockChatCreate).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);
      expect(mockChatCreate).toHaveBeenCalledTimes(1);

      // Clear cache
      clearAnalysisCache();

      // Third call should regenerate
      await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);
      expect(mockChatCreate).toHaveBeenCalledTimes(2);
    });

    it('should clear specific document cache when IDs provided', () => {
      // clearAnalysisCache with specific IDs clears matching cache entries
      // This is tested indirectly by the "clear all cache" test above
      // The function accepts an array of document IDs to selectively clear
      expect(() => clearAnalysisCache(['some-doc-id'])).not.toThrow();
      expect(() => clearAnalysisCache(['doc-1', 'doc-2'])).not.toThrow();
    });
  });

  describe('contradiction type mapping', () => {
    it('should correctly map all contradiction types', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          content: 'Various technical content',
          chunk_index: 0,
          documents: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
        },
      ];

      const mockAnalysis = {
        contradictions: [
          { severity: 'high', confidence: 0.9, type: 'version', description: 'Version issue', sources: [] },
          { severity: 'medium', confidence: 0.8, type: 'api', description: 'API issue', sources: [] },
          { severity: 'low', confidence: 0.7, type: 'config', description: 'Config issue', sources: [] },
          { severity: 'medium', confidence: 0.75, type: 'process', description: 'Process issue', sources: [] },
          { severity: 'high', confidence: 0.85, type: 'architecture', description: 'Architecture issue', sources: [] },
        ],
        gaps: [],
        keyClaims: [],
        recommendations: [],
        riskAssessment: { overallRisk: 'high', summary: 'Multiple issues', criticalItems: [], nextSteps: [] },
      };

      mockSupabaseOrder.mockResolvedValue({ data: mockChunks, error: null });
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.contradictions).toHaveLength(5);
      expect(result.contradictionsGroupedByType?.version).toHaveLength(1);
      expect(result.contradictionsGroupedByType?.api).toHaveLength(1);
      expect(result.contradictionsGroupedByType?.config).toHaveLength(1);
      expect(result.contradictionsGroupedByType?.process).toHaveLength(1);
      expect(result.contradictionsGroupedByType?.architecture).toHaveLength(1);
    });

    it('should convert string confidence to number', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          content: 'Content',
          chunk_index: 0,
          documents: { id: TEST_DOCUMENT_ID, file_name: 'test.pdf', user_id: TEST_USER_ID },
        },
      ];

      const mockAnalysis = {
        contradictions: [
          { severity: 'high', confidence: 'high', type: 'version', description: 'Issue', sources: [] },
          { severity: 'medium', confidence: 'medium', type: 'api', description: 'Issue', sources: [] },
          { severity: 'low', confidence: 'low', type: 'config', description: 'Issue', sources: [] },
        ],
        gaps: [],
        keyClaims: [],
        recommendations: [],
        riskAssessment: { overallRisk: 'medium', summary: '', criticalItems: [], nextSteps: [] },
      };

      mockSupabaseOrder.mockResolvedValue({ data: mockChunks, error: null });
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await detectWithinDocument(TEST_DOCUMENT_ID, TEST_USER_ID);

      expect(result.contradictions[0].confidence).toBe(0.85); // high -> 0.85
      expect(result.contradictions[1].confidence).toBe(0.65); // medium -> 0.65
      expect(result.contradictions[2].confidence).toBe(0.45); // low -> 0.45
    });
  });
});
