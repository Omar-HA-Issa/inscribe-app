import { SupabaseClient } from '@supabase/supabase-js';
import { EmbeddingService } from './embedding.service';
import { logger } from '../../shared/utils/logger';

/**
 * Legacy SearchService wrapper for backward compatibility
 */
export class SearchService {
  constructor(chunkRepository: any, embeddingService: any) {
    // Legacy constructor signature for compatibility
  }

  async searchChunks(
    query: string,
    topK: number,
    similarityThreshold: number,
    selectedDocumentIds?: string[],
    sb?: SupabaseClient,
    userId?: string
  ): Promise<any[]> {
    if (!sb) {
      throw new Error('Supabase client is required');
    }

    try {
      // Generate embedding for the query
      const embeddings = await EmbeddingService.generateEmbeddings([query]);

      if (!embeddings || embeddings.length === 0) {
        logger.error('Failed to generate embedding', { query });
        throw new Error('Failed to generate embedding for query');
      }

      const queryEmbedding = embeddings[0];

      // Call the Supabase RPC function
      const { data, error } = await sb.rpc('match_document_chunks', {
        query_embedding: queryEmbedding as unknown as number[],
        match_threshold: similarityThreshold,
        match_count: topK,
        only_document_ids: selectedDocumentIds || null,
      });

      if (error) {
        logger.error('RPC error:', { error: error.message || error });
        throw new Error(`Search RPC error: ${error.message || error}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Search error:', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  async getDocumentChunks(
    documentId: string,
    maxChunks: number,
    sb?: SupabaseClient
  ): Promise<any[]> {
    if (!sb) {
      throw new Error('Supabase client is required');
    }

    try {
      const { data, error } = await sb
        .from('document_chunks')
        .select('id, document_id, content, embedding, metadata')
        .eq('document_id', documentId)
        .limit(maxChunks);

      if (error) {
        throw new Error(`Database query error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Get document chunks error:', { error });
      throw error;
    }
  }
}
