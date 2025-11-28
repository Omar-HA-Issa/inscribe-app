/**
 * Chunk entity representing a text chunk from a document with its embedding
 */
export class Chunk {
  constructor(
    public id: string,
    public documentId: string,
    public chunkIndex: number,
    public content: string,
    public embedding: number[] | null = null,
    public tokenCount: number = 0,
    public createdAt: Date = new Date()
  ) {}

  /**
   * Check if chunk has embedding
   */
  hasEmbedding(): boolean {
    return this.embedding !== null && this.embedding.length > 0;
  }

  /**
   * Get chunk size in tokens
   */
  getTokenCount(): number {
    return this.tokenCount;
  }

  /**
   * Convert to DTO for API responses
   */
  toDTO() {
    return {
      id: this.id,
      documentId: this.documentId,
      chunkIndex: this.chunkIndex,
      content: this.content,
      tokenCount: this.tokenCount,
      createdAt: this.createdAt.toISOString(),
      hasEmbedding: this.hasEmbedding(),
    };
  }
}

/**
 * DTO for creating a chunk
 */
export interface CreateChunkDTO {
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding?: number[];
}

/**
 * Search result chunk with similarity score
 */
export interface ChunkSearchResult {
  chunk: Chunk;
  similarity: number;
}
