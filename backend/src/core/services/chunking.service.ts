import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { encoding_for_model, Tiktoken } from 'tiktoken';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

export class ChunkingService {
  private splitter: RecursiveCharacterTextSplitter;
  private encoder: Tiktoken;

  constructor() {
    // Create encoder once and reuse it
    this.encoder = encoding_for_model('gpt-4');

    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1200, // in tokens (approx: we still check with encoder)
      chunkOverlap: 150,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });
  }

  private countTokens(text: string): number {
    const tokens = this.encoder.encode(text);
    return tokens.length;
  }

  async chunkText(text: string): Promise<TextChunk[]> {
    try {
      if (!text || !text.trim()) {
        return [];
      }

      console.log('✂️ Starting document chunking...');
      console.log('   Raw length:', text.length, 'characters');

      const roughChunks = await this.splitter.splitText(text);

      console.log('   Rough chunks created:', roughChunks.length);

      const chunks: TextChunk[] = [];
      let index = 0;

      for (const chunk of roughChunks) {
        const tokenCount = this.countTokens(chunk);

        const finalChunk: TextChunk = {
          content: chunk,
          chunkIndex: index++,
          tokenCount,
        };

        chunks.push(finalChunk);
      }

      if (chunks.length === 0) {
        console.warn('⚠️ No chunks produced from text');
        return [];
      }

      // Compute stats
      const totalChars = chunks.reduce((sum, c) => sum + c.content.length, 0);
      const avgChars = totalChars / chunks.length;

      const avgTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length;
      const maxTokens = Math.max(...chunks.map((c) => c.tokenCount));
      const minTokens = Math.min(...chunks.map((c) => c.tokenCount));

      console.log(`📈 Chunk statistics:`);
      console.log(`   Average: ${Math.round(avgChars)} chars, ${Math.round(avgTokens)} tokens`);
      console.log(`   Range: ${minTokens} - ${maxTokens} tokens`);

      return chunks;
    } finally {
      // Free encoder when done
      this.encoder.free();
    }
  }
}
