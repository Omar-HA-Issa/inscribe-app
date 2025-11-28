import { Insight, CreateInsightDTO } from '../../entities/Insight';

/**
 * Repository interface for Insight data access
 * Defines contract for all insight database operations
 */
export interface IInsightRepository {
  /**
   * Find an insight by ID
   */
  findById(id: string): Promise<Insight | null>;

  /**
   * Find all insights for a document
   */
  findByDocumentId(documentId: string, limit?: number, offset?: number): Promise<Insight[]>;

  /**
   * Find all insights for a user
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Insight[]>;

  /**
   * Create an insight
   */
  create(data: CreateInsightDTO): Promise<Insight>;

  /**
   * Create multiple insights
   */
  createBatch(data: CreateInsightDTO[]): Promise<Insight[]>;

  /**
   * Delete an insight
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all insights for a document
   */
  deleteByDocumentId(documentId: string): Promise<void>;

  /**
   * Count insights for a document
   */
  countByDocumentId(documentId: string): Promise<number>;
}
