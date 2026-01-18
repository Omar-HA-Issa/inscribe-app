import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_EMBEDDING } from '../../mocks/fixtures';

// Declare mock at module level - will be populated by the mock factory
const mockEmbeddingsCreate = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    embeddings = {
      create: (...args: any[]) => mockEmbeddingsCreate(...args),
    };
  },
}));

// Import after mocking
import { EmbeddingService } from '../../../src/core/services/embedding.service';

describe('EmbeddingService', () => {
  beforeEach(() => {
    mockEmbeddingsCreate.mockReset();
  });

  describe('generateEmbeddings', () => {
    it('should return empty array for empty input', async () => {
      const result = await EmbeddingService.generateEmbeddings([]);
      expect(result).toEqual([]);
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });

    it('should generate embeddings for single text', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: TEST_EMBEDDING, index: 0 }],
        model: 'text-embedding-3-small',
      });

      const result = await EmbeddingService.generateEmbeddings(['Hello world']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(TEST_EMBEDDING);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['Hello world'],
      });
    });

    it('should generate embeddings for multiple texts', async () => {
      const embedding1 = TEST_EMBEDDING.map(v => v + 0.01);
      const embedding2 = TEST_EMBEDDING.map(v => v + 0.02);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [
          { embedding: embedding1, index: 0 },
          { embedding: embedding2, index: 1 },
        ],
        model: 'text-embedding-3-small',
      });

      const result = await EmbeddingService.generateEmbeddings(['Text 1', 'Text 2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(embedding1);
      expect(result[1]).toEqual(embedding2);
    });

    it('should sort embeddings by index', async () => {
      const embedding1 = TEST_EMBEDDING.map(v => v + 0.01);
      const embedding2 = TEST_EMBEDDING.map(v => v + 0.02);

      // Return in reverse order to test sorting
      mockEmbeddingsCreate.mockResolvedValue({
        data: [
          { embedding: embedding2, index: 1 },
          { embedding: embedding1, index: 0 },
        ],
        model: 'text-embedding-3-small',
      });

      const result = await EmbeddingService.generateEmbeddings(['Text 1', 'Text 2']);

      expect(result[0]).toEqual(embedding1);
      expect(result[1]).toEqual(embedding2);
    });

    it('should process in batches of 64', async () => {
      // Create 70 texts (should be 2 batches: 64 + 6)
      const texts = Array(70).fill(null).map((_, i) => `Text ${i}`);

      const createEmbeddingResponse = (count: number) => ({
        data: Array(count).fill(null).map((_, i) => ({
          embedding: TEST_EMBEDDING.map(v => v + i * 0.001),
          index: i,
        })),
        model: 'text-embedding-3-small',
      });

      mockEmbeddingsCreate
        .mockResolvedValueOnce(createEmbeddingResponse(64))
        .mockResolvedValueOnce(createEmbeddingResponse(6));

      const result = await EmbeddingService.generateEmbeddings(texts);

      expect(result).toHaveLength(70);
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2);

      // First batch should have 64 items
      expect(mockEmbeddingsCreate.mock.calls[0][0].input).toHaveLength(64);
      // Second batch should have 6 items
      expect(mockEmbeddingsCreate.mock.calls[1][0].input).toHaveLength(6);
    });

    it('should throw error when OpenAI API fails', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(EmbeddingService.generateEmbeddings(['Test']))
        .rejects.toThrow('API rate limit exceeded');
    });

    it('should use text-embedding-3-small model', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: TEST_EMBEDDING, index: 0 }],
        model: 'text-embedding-3-small',
      });

      await EmbeddingService.generateEmbeddings(['Test']);

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
        })
      );
    });
  });
});
