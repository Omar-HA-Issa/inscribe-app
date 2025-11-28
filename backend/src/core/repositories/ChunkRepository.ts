import { SupabaseClient } from '@supabase/supabase-js';
import { IChunkRepository } from '../domain/interfaces/repositories';
import { Chunk, CreateChunkDTO, ChunkSearchResult } from '../domain/entities/Chunk';
import { NotFoundError } from '../../shared/errors';

/**
 * Implementation of IChunkRepository using Supabase
 */
export class ChunkRepository implements IChunkRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async findById(id: string): Promise<Chunk | null> {
    const { data, error } = await this.supabaseClient
      .from('document_chunks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToDomain(data);
  }

  async findByDocumentId(documentId: string, limit = 100, offset = 0): Promise<Chunk[]> {
    const { data, error } = await this.supabaseClient
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return (data || []).map(chunk => this.mapToDomain(chunk));
  }

  async create(data: CreateChunkDTO): Promise<Chunk> {
    const { data: createdChunk, error } = await this.supabaseClient
      .from('document_chunks')
      .insert([
        {
          document_id: data.documentId,
          chunk_index: data.chunkIndex,
          content: data.content,
          embedding: data.embedding || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !createdChunk) {
      throw error || new Error('Failed to create chunk');
    }

    return this.mapToDomain(createdChunk);
  }

  async createBatch(data: CreateChunkDTO[]): Promise<Chunk[]> {
    const chunks = data.map(chunk => ({
      document_id: chunk.documentId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding: chunk.embedding || null,
      created_at: new Date().toISOString(),
    }));

    const { data: createdChunks, error } = await this.supabaseClient
      .from('document_chunks')
      .insert(chunks)
      .select();

    if (error || !createdChunks) {
      throw error || new Error('Failed to create chunks');
    }

    return createdChunks.map(chunk => this.mapToDomain(chunk));
  }

  async update(id: string, data: Partial<CreateChunkDTO>): Promise<Chunk> {
    const chunk = await this.findById(id);
    if (!chunk) {
      throw new NotFoundError('Chunk', id);
    }

    const updateData: Record<string, unknown> = {};

    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    if (data.embedding !== undefined) {
      updateData.embedding = data.embedding;
    }

    const { data: updatedChunk, error } = await this.supabaseClient
      .from('document_chunks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedChunk) {
      throw error || new Error('Failed to update chunk');
    }

    return this.mapToDomain(updatedChunk);
  }

  async delete(id: string): Promise<void> {
    const chunk = await this.findById(id);
    if (!chunk) {
      throw new NotFoundError('Chunk', id);
    }

    const { error } = await this.supabaseClient
      .from('document_chunks')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const { error } = await this.supabaseClient
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      throw error;
    }
  }

  async countByDocumentId(documentId: string): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (error) {
      throw error;
    }

    return count || 0;
  }

  async vectorSearch(
    queryEmbedding: number[],
    matchThreshold: number,
    matchCount: number,
    documentIds?: string[]
  ): Promise<ChunkSearchResult[]> {
    const { data, error } = await this.supabaseClient.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      only_document_ids: documentIds || null,
    });

    if (error) {
      throw error;
    }

    return (data || []).map((result: any) => ({
      chunk: this.mapToDomain(result),
      similarity: result.similarity,
    }));
  }

  /**
   * Map database record to domain entity
   */
  private mapToDomain(data: any): Chunk {
    return new Chunk(
      data.id,
      data.document_id,
      data.chunk_index,
      data.content,
      data.embedding || null,
      0, // tokenCount not stored, can be computed if needed
      new Date(data.created_at)
    );
  }
}
