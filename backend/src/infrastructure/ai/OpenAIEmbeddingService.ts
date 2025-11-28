import OpenAI from 'openai';
import { IEmbeddingService } from '../../core/domain/interfaces/services';
import { EMBEDDING_CONFIG } from '../../shared/constants/config';

/**
 * OpenAI implementation of IEmbeddingService
 * Generates text embeddings using OpenAI's text-embedding-3-small model
 */
export class OpenAIEmbeddingService implements IEmbeddingService {
  private readonly model = EMBEDDING_CONFIG.MODEL;
  private readonly batchSize = EMBEDDING_CONFIG.BATCH_SIZE;
  private readonly dimension = 1536; // text-embedding-3-small dimension

  constructor(private openaiClient: OpenAI) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      const response = await this.openaiClient.embeddings.create({
        model: this.model,
        input: batch,
      });

      // Sort by index to maintain order
      const sortedEmbeddings = response.data.sort((a, b) => a.index - b.index);

      for (const embedding of sortedEmbeddings) {
        embeddings.push(embedding.embedding);
      }
    }

    return embeddings;
  }

  getModel(): string {
    return this.model;
  }

  getDimension(): number {
    return this.dimension;
  }
}
