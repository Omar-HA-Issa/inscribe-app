import { FILE_CONFIG, CACHE_TTL } from '../../shared/constants/config';
import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConflictError, BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/utils/logger';

/**
 * FileUploadService
 * Handles file upload operations following SRP (Single Responsibility Principle)
 * Responsibilities: validation, deduplication, hash generation
 */
export class FileUploadService {
  /**
   * Check if file upload is allowed based on size and type
   */
  static validateFileUpload(
    mimetype: string,
    size: number,
    filename: string
  ): void {
    if (size === 0) {
      throw new BadRequestError('File is empty. Please upload a file with content.');
    }

    if (size > FILE_CONFIG.MAX_SIZE) {
      throw new BadRequestError(
        `File too large. Maximum size is ${FILE_CONFIG.MAX_SIZE / 1024 / 1024}MB.`
      );
    }

    if (!(FILE_CONFIG.ALLOWED_MIME_TYPES as readonly string[]).includes(mimetype)) {
      throw new BadRequestError(
        `Invalid file type. Only ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')} files are allowed.`
      );
    }

    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    if (!(FILE_CONFIG.ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      throw new BadRequestError(
        `Invalid file extension. Only ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')} files are allowed.`
      );
    }
  }

  /**
   * Generate SHA256 hash of file contents for deduplication
   */
  static generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if user already has this exact file (by hash)
   * Prevents duplicate uploads
   */
  static async checkDuplicateDocument(
    userId: string,
    fileHash: string,
    sb: SupabaseClient
  ): Promise<any | null> {
    logger.debug('Checking for duplicate document', { userId, fileHash });

    const { data, error } = await sb
      .from('documents')
      .select('id, file_name, created_at')
      .eq('user_id', userId)
      .eq('file_hash', fileHash)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  }

  /**
   * Create document record in database
   */
  static async createDocumentRecord(
    userId: string,
    file: Express.Multer.File,
    fileHash: string,
    sb: SupabaseClient
  ): Promise<string> {
    logger.debug('Creating document record', {
      userId,
      filename: file.originalname,
    });

    const { data, error } = await sb
      .from('documents')
      .insert({
        user_id: userId,
        title: file.originalname,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        content: null,
        file_url: null,
        metadata: {},
        file_hash: fileHash,
      })
      .select('id')
      .single();

    if (error || !data) {
      logger.error('Failed to insert document', { error });
      throw error || new Error('Failed to create document record');
    }

    return data.id;
  }

  /**
   * Save document chunks to database
   */
  static async saveChunks(
    documentId: string,
    chunks: Array<{
      content: string;
      index: number;
      embedding: number[];
      metadata?: Record<string, any>;
    }>,
    sb: SupabaseClient
  ): Promise<void> {
    const INSERT_BATCH = 100;

    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const batch = chunks.slice(i, i + INSERT_BATCH);
      const rows = batch.map((c) => ({
        document_id: documentId,
        content: c.content,
        chunk_index: c.index,
        embedding: c.embedding,
        metadata: c.metadata || null,
      }));

      logger.debug('Saving chunk batch', {
        documentId,
        batchStart: i,
        batchEnd: Math.min(i + INSERT_BATCH, chunks.length),
      });

      const { error } = await sb.from('document_chunks').insert(rows);

      if (error) {
        logger.error('Failed to insert chunks batch', { error, batchStart: i });
        throw error;
      }
    }

    logger.info('All chunks saved successfully', {
      documentId,
      totalChunks: chunks.length,
    });
  }
}
