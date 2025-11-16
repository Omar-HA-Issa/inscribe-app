import OpenAI from "openai";

function getClient(apiKey?: string) {
  return new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY! });
}

/**
 * Supports BOTH static and instance usage:
 */

export class EmbeddingService {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = getClient(apiKey);
  }

  static async generateEmbedding(input: string): Promise<number[]> {
    const client = getClient();
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });

    return response.data[0].embedding;
  }

  static async generateEmbeddings(input: string[] | string): Promise<number[][]> {
    const client = getClient();
    const inputs = Array.isArray(input) ? input : [input];

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: inputs,
    });

    return response.data.map((item) => item.embedding);
  }

  async generateEmbedding(input: string): Promise<number[]> {
    return EmbeddingService.generateEmbedding(input);
  }

  async generateEmbeddings(input: string[] | string): Promise<number[][]> {
    return EmbeddingService.generateEmbeddings(input);
  }
}

// Optional default instance for imports like: `import embeddingService from ...`
const embeddingService = new EmbeddingService();
export default embeddingService;
