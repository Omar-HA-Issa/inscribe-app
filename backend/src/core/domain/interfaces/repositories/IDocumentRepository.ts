import { Document, CreateDocumentDTO, UpdateDocumentDTO } from '../../entities/Document';

/**
 * Repository interface for Document data access
 * Defines contract for all document database operations
 */
export interface IDocumentRepository {
  /**
   * Find a document by ID
   */
  findById(id: string, userId: string): Promise<Document | null>;

  /**
   * Find all documents for a user
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Document[]>;

  /**
   * Find a document by file hash
   */
  findByHash(hash: string, userId: string): Promise<Document | null>;

  /**
   * Create a new document
   */
  create(data: CreateDocumentDTO): Promise<Document>;

  /**
   * Update a document
   */
  update(id: string, userId: string, data: UpdateDocumentDTO): Promise<Document>;

  /**
   * Delete a document
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Count documents for a user
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * Check if document exists and belongs to user
   */
  exists(id: string, userId: string): Promise<boolean>;
}
