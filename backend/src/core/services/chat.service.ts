import { adminClient } from '../../core/clients/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { SearchService } from './search.service';
import { logger } from '../../shared/utils/logger';

// OpenAI API response type
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * Legacy ChatService wrapper for backward compatibility
 * This maintains the old static method API while delegating to the new services
 */
export class ChatService {
  static async chat(
    question: string,
    topK: number = 6,
    similarityThreshold: number = 0.15,
    selectedDocumentIds?: string[],
    sb?: SupabaseClient,
    userId?: string
  ): Promise<ChatResponse> {
    try {
      const client = sb || adminClient();
      const searchService = new SearchService(null as any, null as any); // Uses legacy pattern

      // Perform semantic search
      const chunks = await searchService.searchChunks(
        question,
        topK,
        similarityThreshold,
        selectedDocumentIds,
        client,
        userId
      );

      if (!chunks || chunks.length === 0) {
        return {
          success: true,
          answer: 'I could not find relevant information in the selected documents. Try adjusting your selection or rephrasing your question.',
          sources: [],
          chunksUsed: 0,
        };
      }

      // Build context from chunks
      const context = chunks
        .map((chunk, idx) => {
          return `[${idx + 1}] Similarity: ${(chunk.similarity * 100).toFixed(1)}%\n${chunk.content}\n`;
        })
        .join('\n---\n');

      // Generate answer using OpenAI
      const response = await this.generateAnswer(question, context);

      // Build sources
      const docMap = new Map<string, number>();
      for (const chunk of chunks) {
        docMap.set(chunk.document_id, (docMap.get(chunk.document_id) || 0) + 1);
      }

      const sources = Array.from(docMap.entries()).map(([docId, count]) => ({
        documentId: docId,
        chunksUsed: count,
      }));

      return {
        success: true,
        answer: response,
        sources,
        chunksUsed: chunks.length,
      };
    } catch (error) {
      logger.error('Chat error:', { error });
      throw error;
    }
  }

  static async summarizeDocument(
    documentId: string,
    maxChunks: number = 30,
    sb?: SupabaseClient
  ): Promise<SummaryResponse> {
    try {
      const client = sb || adminClient();
      const searchService = new SearchService(null as any, null as any);

      // Get chunks for this document
      const chunks = await searchService.getDocumentChunks(documentId, maxChunks, client);

      if (!chunks || chunks.length === 0) {
        return {
          success: true,
          summary: 'No content found in this document.',
          chunksUsed: 0,
        };
      }

      // Build full text from chunks
      const fullText = chunks.map(c => c.content).join('\n\n');

      // Generate summary
      const summary = await this.generateSummary(fullText);

      return {
        success: true,
        summary,
        chunksUsed: chunks.length,
      };
    } catch (error) {
      logger.error('Summarize error:', { error });
      throw error;
    }
  }

  private static async generateAnswer(question: string, context: string): Promise<string> {
    // Use OpenAI to generate answer
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers questions based on provided document excerpts. Always cite which document your information comes from.',
          },
          {
            role: 'user',
            content: `Based on the following document excerpts, answer this question:\n\nQuestion: ${question}\n\nContext:\n${context}\n\nProvide a comprehensive answer based on the provided context.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json() as OpenAIResponse;
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message}`);
    }

    return data.choices[0]?.message?.content || 'Unable to generate response';
  }

  private static async generateSummary(text: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise, informative document summaries.',
          },
          {
            role: 'user',
            content: `Please provide a comprehensive summary of the following document:\n\n${text}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    const data = await response.json() as OpenAIResponse;
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message}`);
    }

    return data.choices[0]?.message?.content || 'Unable to generate summary';
  }
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: Array<{ documentId: string; chunksUsed: number }>;
  chunksUsed: number;
}

export interface SummaryResponse {
  success: boolean;
  summary: string;
  chunksUsed: number;
}

export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
}
