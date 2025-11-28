import { SupabaseClient } from '@supabase/supabase-js';
import { IDocumentRepository } from '../domain/interfaces/repositories';
import { Document, CreateDocumentDTO, UpdateDocumentDTO } from '../domain/entities/Document';
import { NotFoundError } from '../../shared/errors';

/**
 * Implementation of IDocumentRepository using Supabase
 */
export class DocumentRepository implements IDocumentRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async findById(id: string, userId: string): Promise<Document | null> {
    const { data, error } = await this.supabaseClient
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToDomain(data);
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Document[]> {
    const { data, error } = await this.supabaseClient
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return (data || []).map(doc => this.mapToDomain(doc));
  }

  async findByHash(hash: string, userId: string): Promise<Document | null> {
    const { data, error } = await this.supabaseClient
      .from('documents')
      .select('*')
      .eq('file_hash', hash)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToDomain(data);
  }

  async create(data: CreateDocumentDTO): Promise<Document> {
    const { data: createdDoc, error } = await this.supabaseClient
      .from('documents')
      .insert([
        {
          user_id: data.userId,
          file_name: data.fileName,
          file_type: data.fileType,
          file_size: data.fileSize,
          file_hash: data.fileHash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !createdDoc) {
      throw error || new Error('Failed to create document');
    }

    return this.mapToDomain(createdDoc);
  }

  async update(id: string, userId: string, data: UpdateDocumentDTO): Promise<Document> {
    // Verify document belongs to user
    const doc = await this.findById(id, userId);
    if (!doc) {
      throw new NotFoundError('Document', id);
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.summary) {
      updateData.summary = JSON.stringify(data.summary);
    }

    if (data.metadata) {
      updateData.metadata = data.metadata;
    }

    const { data: updatedDoc, error } = await this.supabaseClient
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updatedDoc) {
      throw error || new Error('Failed to update document');
    }

    return this.mapToDomain(updatedDoc);
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verify document belongs to user
    const doc = await this.findById(id, userId);
    if (!doc) {
      throw new NotFoundError('Document', id);
    }

    const { error } = await this.supabaseClient
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  async countByUserId(userId: string): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return count || 0;
  }

  async exists(id: string, userId: string): Promise<boolean> {
    const doc = await this.findById(id, userId);
    return doc !== null;
  }

  /**
   * Map database record to domain entity
   */
  private mapToDomain(data: any): Document {
    return new Document(
      data.id,
      data.user_id,
      data.file_name,
      data.file_type,
      data.file_size,
      data.file_hash,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.summary ? JSON.parse(data.summary) : null,
      data.metadata || null,
      0 // chunkCount will be fetched separately if needed
    );
  }
}
