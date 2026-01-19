import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../../../src/core/services/search.service';
import { createMockSupabaseClient, createMockQueryBuilder } from '../../mocks/supabase.mock';
import { TEST_DOCUMENT_ID, TEST_EMBEDDING, TEST_CHUNK } from '../../mocks/fixtures';

// Mock the embedding service
vi.mock('../../../src/core/services/embedding.service', () => ({
  EmbeddingService: {
    generateEmbeddings: vi.fn(),
  },
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

import { EmbeddingService } from '../../../src/core/services/embedding.service';

describe('SearchService', () => {
  let searchService: SearchService;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    searchService = new SearchService(null, null);
    mockSupabase = createMockSupabaseClient();
  });

  describe('searchChunks', () => {
    it('should throw error when supabase client is not provided', async () => {
      await expect(searchService.searchChunks('test query', 5, 0.5))
        .rejects.toThrow('Supabase client is required');
    });

    it('should throw error when embedding generation fails', async () => {
      vi.mocked(EmbeddingService.generateEmbeddings).mockResolvedValue([]);

      await expect(searchService.searchChunks('test query', 5, 0.5, undefined, mockSupabase))
        .rejects.toThrow('Failed to generate embedding for query');
    });

    it('should call RPC with correct parameters', async () => {
      vi.mocked(EmbeddingService.generateEmbeddings).mockResolvedValue([TEST_EMBEDDING]);
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await searchService.searchChunks('test query', 5, 0.5, undefined, mockSupabase);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_document_chunks', {
        query_embedding: TEST_EMBEDDING,
        match_threshold: 0.5,
        match_count: 5,
        only_document_ids: null,
      });
    });

    it('should pass document IDs filter when provided', async () => {
      vi.mocked(EmbeddingService.generateEmbeddings).mockResolvedValue([TEST_EMBEDDING]);
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      const docIds = [TEST_DOCUMENT_ID, 'another-doc-id'];

      await searchService.searchChunks('test query', 5, 0.5, docIds, mockSupabase);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_document_chunks', {
        query_embedding: TEST_EMBEDDING,
        match_threshold: 0.5,
        match_count: 5,
        only_document_ids: docIds,
      });
    });

    it('should return search results', async () => {
      const mockResults = [
        { id: '1', document_id: TEST_DOCUMENT_ID, content: 'Result 1', similarity: 0.9 },
        { id: '2', document_id: TEST_DOCUMENT_ID, content: 'Result 2', similarity: 0.8 },
      ];

      vi.mocked(EmbeddingService.generateEmbeddings).mockResolvedValue([TEST_EMBEDDING]);
      mockSupabase.rpc.mockResolvedValue({ data: mockResults, error: null });

      const result = await searchService.searchChunks('test query', 5, 0.5, undefined, mockSupabase);

      expect(result).toEqual(mockResults);
    });

    it('should throw error when RPC fails', async () => {
      vi.mocked(EmbeddingService.generateEmbeddings).mockResolvedValue([TEST_EMBEDDING]);
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function not found' },
      });

      await expect(searchService.searchChunks('test query', 5, 0.5, undefined, mockSupabase))
        .rejects.toThrow('Search RPC error');
    });

    it('should return empty array when no results found', async () => {
      vi.mocked(EmbeddingService.generateEmbeddings).mockResolvedValue([TEST_EMBEDDING]);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await searchService.searchChunks('test query', 5, 0.5, undefined, mockSupabase);

      expect(result).toEqual([]);
    });
  });

  describe('getDocumentChunks', () => {
    it('should throw error when supabase client is not provided', async () => {
      await expect(searchService.getDocumentChunks(TEST_DOCUMENT_ID, 10))
        .rejects.toThrow('Supabase client is required');
    });

    it('should query document chunks with correct parameters', async () => {
      const queryBuilder = createMockQueryBuilder([TEST_CHUNK], null);
      mockSupabase.from.mockReturnValue(queryBuilder);

      await searchService.getDocumentChunks(TEST_DOCUMENT_ID, 10, mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith('document_chunks');
      expect(queryBuilder.select).toHaveBeenCalledWith('id, document_id, content, embedding, metadata');
      expect(queryBuilder.eq).toHaveBeenCalledWith('document_id', TEST_DOCUMENT_ID);
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should return document chunks', async () => {
      const mockChunks = [
        { id: '1', document_id: TEST_DOCUMENT_ID, content: 'Chunk 1' },
        { id: '2', document_id: TEST_DOCUMENT_ID, content: 'Chunk 2' },
      ];

      const queryBuilder = createMockQueryBuilder(mockChunks, null);
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await searchService.getDocumentChunks(TEST_DOCUMENT_ID, 10, mockSupabase);

      expect(result).toEqual(mockChunks);
    });

    it('should throw error when database query fails', async () => {
      const queryBuilder = createMockQueryBuilder(null, { message: 'Database error' });
      mockSupabase.from.mockReturnValue(queryBuilder);

      await expect(searchService.getDocumentChunks(TEST_DOCUMENT_ID, 10, mockSupabase))
        .rejects.toThrow('Database query error');
    });

    it('should return empty array when no chunks found', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await searchService.getDocumentChunks(TEST_DOCUMENT_ID, 10, mockSupabase);

      expect(result).toEqual([]);
    });
  });
});
