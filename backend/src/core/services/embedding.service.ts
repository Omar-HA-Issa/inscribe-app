import OpenAI from 'openai';

/**
 * Legacy EmbeddingService wrapper for backward compatibility
 * This is a simplified interface that maintains the old static method API
 * while delegating to OpenAI's client
 */
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class EmbeddingService {
  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const embeddings: number[][] = [];
    const BATCH_SIZE = 64; // Process in reasonable batch sizes

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
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
}
