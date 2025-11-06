import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { encoding_for_model } from 'tiktoken';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

export class ChunkingService {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1200,
      chunkOverlap: 150,
      lengthFunction: this.countTokens.bind(this),
    });
  }

  private countTokens(text: string): number {
    const encoder = encoding_for_model('gpt-4');
    const tokens = encoder.encode(text);
    encoder.free();
    return tokens.length;
  }

  async chunkText(text: string): Promise<TextChunk[]> {
    const docs = await this.splitter.createDocuments([text]);

    return docs.map((doc, index) => ({
      content: doc.pageContent,
      chunkIndex: index,
      tokenCount: this.countTokens(doc.pageContent),
    }));
  }
}