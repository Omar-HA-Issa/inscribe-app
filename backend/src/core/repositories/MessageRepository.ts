import { SupabaseClient } from '@supabase/supabase-js';
import { IMessageRepository } from '../domain/interfaces/repositories';
import { Message, CreateMessageDTO } from '../domain/entities/Message';
import { NotFoundError } from '../../shared/errors';

/**
 * Implementation of IMessageRepository using Supabase
 */
export class MessageRepository implements IMessageRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async findById(id: string): Promise<Message | null> {
    const { data, error } = await this.supabaseClient
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToDomain(data);
  }

  async findByConversationId(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await this.supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return (data || []).map(msg => this.mapToDomain(msg));
  }

  async findByDocumentId(documentId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await this.supabaseClient
      .from('messages')
      .select(`
        *,
        conversations!inner(document_id)
      `)
      .eq('conversations.document_id', documentId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return (data || []).map(msg => this.mapToDomain(msg));
  }

  async create(data: CreateMessageDTO): Promise<Message> {
    const { data: createdMsg, error } = await this.supabaseClient
      .from('messages')
      .insert([
        {
          conversation_id: data.conversationId,
          user_id: data.userId,
          content: data.content,
          role: data.role,
          metadata: data.metadata || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !createdMsg) {
      throw error || new Error('Failed to create message');
    }

    return this.mapToDomain(createdMsg);
  }

  async delete(id: string): Promise<void> {
    const msg = await this.findById(id);
    if (!msg) {
      throw new NotFoundError('Message', id);
    }

    const { error } = await this.supabaseClient
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async countByConversationId(conversationId: string): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) {
      throw error;
    }

    return count || 0;
  }

  /**
   * Map database record to domain entity
   */
  private mapToDomain(data: any): Message {
    return new Message(
      data.id,
      data.conversation_id,
      data.user_id,
      data.content,
      data.role,
      new Date(data.created_at),
      data.metadata || null
    );
  }
}
