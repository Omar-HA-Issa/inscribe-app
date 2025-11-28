/**
 * Document entity representing an uploaded document with metadata
 */
export class Document {
  constructor(
    public id: string,
    public userId: string,
    public fileName: string,
    public fileType: string,
    public fileSize: number,
    public fileHash: string,
    public createdAt: Date,
    public updatedAt: Date,
    public summary: DocumentSummary | null = null,
    public metadata: DocumentMetadata | null = null,
    public chunkCount: number = 0
  ) {}

  /**
   * Check if document belongs to user
   */
  belongsToUser(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * Check if document has been summarized
   */
  hasSummary(): boolean {
    return this.summary !== null;
  }

  /**
   * Convert to DTO for API responses
   */
  toDTO() {
    return {
      id: this.id,
      userId: this.userId,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      fileHash: this.fileHash,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      summary: this.summary,
      metadata: this.metadata,
      chunkCount: this.chunkCount,
    };
  }
}

export interface DocumentSummary {
  overview: string;
  keyFindings: string[];
  keywords: string[];
  wordCount: number;
  pageCount: number;
  readingTime: number;
}

export interface DocumentMetadata {
  [key: string]: unknown;
}

/**
 * DTO for creating a document
 */
export interface CreateDocumentDTO {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash: string;
}

/**
 * DTO for updating a document
 */
export interface UpdateDocumentDTO {
  summary?: DocumentSummary;
  metadata?: DocumentMetadata;
}
