import { SupabaseClient } from '@supabase/supabase-js';
import { IInsightRepository } from '../domain/interfaces/repositories';
import { Insight, CreateInsightDTO } from '../domain/entities/Insight';
import { NotFoundError } from '../../shared/errors';

/**
 * Implementation of IInsightRepository using Supabase
 */
export class InsightRepository implements IInsightRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async findById(id: string): Promise<Insight | null> {
    const { data, error } = await this.supabaseClient
      .from('document_insights')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToDomain(data);
  }

  async findByDocumentId(documentId: string, limit = 50, offset = 0): Promise<Insight[]> {
    const { data, error } = await this.supabaseClient
      .from('document_insights')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return (data || []).map(insight => this.mapToDomain(insight));
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Insight[]> {
    const { data, error } = await this.supabaseClient
      .from('document_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return (data || []).map(insight => this.mapToDomain(insight));
  }

  async create(data: CreateInsightDTO): Promise<Insight> {
    const { data: createdInsight, error } = await this.supabaseClient
      .from('document_insights')
      .insert([
        {
          document_id: data.documentId || null,
          user_id: data.userId,
          title: data.title,
          description: data.description,
          category: data.category,
          confidence: data.confidence,
          evidence: data.evidence,
          impact: data.impact || null,
          is_compare: data.isCompare || false,
          related_documents: data.relatedDocuments || [],
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !createdInsight) {
      throw error || new Error('Failed to create insight');
    }

    return this.mapToDomain(createdInsight);
  }

  async createBatch(data: CreateInsightDTO[]): Promise<Insight[]> {
    const insights = data.map(insight => ({
      document_id: insight.documentId || null,
      user_id: insight.userId,
      title: insight.title,
      description: insight.description,
      category: insight.category,
      confidence: insight.confidence,
      evidence: insight.evidence,
      impact: insight.impact || null,
      is_compare: insight.isCompare || false,
      related_documents: insight.relatedDocuments || [],
      created_at: new Date().toISOString(),
    }));

    const { data: createdInsights, error } = await this.supabaseClient
      .from('document_insights')
      .insert(insights)
      .select();

    if (error || !createdInsights) {
      throw error || new Error('Failed to create insights');
    }

    return createdInsights.map(insight => this.mapToDomain(insight));
  }

  async delete(id: string): Promise<void> {
    const insight = await this.findById(id);
    if (!insight) {
      throw new NotFoundError('Insight', id);
    }

    const { error } = await this.supabaseClient
      .from('document_insights')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const { error } = await this.supabaseClient
      .from('document_insights')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      throw error;
    }
  }

  async countByDocumentId(documentId: string): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('document_insights')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (error) {
      throw error;
    }

    return count || 0;
  }

  /**
   * Map database record to domain entity
   */
  private mapToDomain(data: any): Insight {
    return new Insight(
      data.id,
      data.document_id,
      data.user_id,
      data.title,
      data.description,
      data.category,
      data.confidence,
      data.evidence,
      data.impact,
      new Date(data.created_at),
      data.is_compare || false,
      data.related_documents || []
    );
  }
}
