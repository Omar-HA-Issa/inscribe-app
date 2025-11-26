/**
 * Service interface for generating text embeddings
 */
export interface IEmbeddingService {
  /**
   * Generate embedding for a single text
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in batch
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Get the embedding model name
   */
  getModel(): string;

  /**
   * Get the embedding dimension
   */
  getDimension(): number;
}
