import { Chunk, CreateChunkDTO, ChunkSearchResult } from '../../entities/Chunk';

/**
 * Repository interface for Chunk data access
 * Defines contract for all chunk database operations
 */
export interface IChunkRepository {
  /**
   * Find a chunk by ID
   */
  findById(id: string): Promise<Chunk | null>;

  /**
   * Find all chunks for a document
   */
  findByDocumentId(documentId: string, limit?: number, offset?: number): Promise<Chunk[]>;

  /**
   * Create a chunk
   */
  create(data: CreateChunkDTO): Promise<Chunk>;

  /**
   * Create multiple chunks in batch
   */
  createBatch(data: CreateChunkDTO[]): Promise<Chunk[]>;

  /**
   * Update a chunk
   */
  update(id: string, data: Partial<CreateChunkDTO>): Promise<Chunk>;

  /**
   * Delete a chunk
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all chunks for a document
   */
  deleteByDocumentId(documentId: string): Promise<void>;

  /**
   * Count chunks for a document
   */
  countByDocumentId(documentId: string): Promise<number>;

  /**
   * Perform vector similarity search
   */
  vectorSearch(
    queryEmbedding: number[],
    matchThreshold: number,
    matchCount: number,
    documentIds?: string[]
  ): Promise<ChunkSearchResult[]>;
}
