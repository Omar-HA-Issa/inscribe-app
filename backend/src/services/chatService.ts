import type { SupabaseClient } from "@supabase/supabase-js";
import { SearchService, type SearchResult } from "./searchService";
import { openai } from "../config/openai";

export interface ChatSource {
  document: string;
  document_id: string;
  chunksUsed: number;
  topSimilarity: number;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: ChatSource[];
  chunksUsed: number;
}

export class ChatService {
  /**
   * Main chat endpoint: semantic search + GPT generation
   */
  static async chat(
    query: string,
    limit: number = 5,
    similarityThreshold: number = 0.5,
    selectedDocumentIds?: string[],
    supabase?: SupabaseClient
  ): Promise<ChatResponse> {
    try {
      // Detect if this is a comparison/difference question
      const isComparisonQuery = /\b(difference|compare|contrast|between|versus|vs|both|each|all)\b/i.test(query);

      let chunks: SearchResult[];

      if (isComparisonQuery && selectedDocumentIds && selectedDocumentIds.length > 1) {
        // For comparison queries, get chunks from each selected document
        console.log('🔀 Comparison query detected - fetching from all selected docs');

        const chunksPerDoc = Math.max(2, Math.ceil(limit / selectedDocumentIds.length));
        const allChunks: SearchResult[] = [];

        for (const docId of selectedDocumentIds) {
          try {
            const docChunks = await SearchService.getDocumentChunks(docId, supabase);
            // Take first N chunks from each document
            allChunks.push(...docChunks.slice(0, chunksPerDoc));
            console.log(`  ✅ Got ${docChunks.length} chunks from document ${docId}`);
          } catch (err) {
            console.error(`  ❌ Failed to get chunks from document ${docId}:`, err);
          }
        }

        chunks = allChunks;
        console.log(`🔀 Total chunks for comparison: ${chunks.length}`);
      } else {
        // Normal semantic search
        chunks = await SearchService.search(
          query,
          limit,
          similarityThreshold,
          selectedDocumentIds,
          supabase
        );
      }

      if (!chunks || chunks.length === 0) {
        return {
          success: true,
          answer:
            "I couldn't find relevant information within the selected documents. Try adjusting your selection or rephrasing the query.",
          sources: [],
          chunksUsed: 0,
        };
      }

      // Build context from chunks
      const context = chunks
        .map(
          (c, idx) =>
            `[${idx + 1}] From "${c.document_title}":\n${c.content}\n`
        )
        .join("\n");

      // Generate answer with GPT
      const systemPrompt = isComparisonQuery
        ? "You are a helpful assistant that compares and contrasts documents. When comparing documents, clearly identify which information comes from which document. Provide a structured comparison highlighting key differences and similarities."
        : "You are a helpful assistant that answers questions based on provided document excerpts. Always cite which document your information comes from.";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Based on the following document excerpts, answer this question:\n\nQuestion: ${query}\n\nContext:\n${context}\n\nAnswer:`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const answer = completion.choices[0]?.message?.content ?? "No answer generated.";

      // Group chunks by document for source citations
      const docMap = new Map<string, { document: string; chunks: SearchResult[] }>();

      for (const chunk of chunks) {
        const key = chunk.document_id;
        if (!docMap.has(key)) {
          docMap.set(key, {
            document: chunk.document_title,
            chunks: [],
          });
        }
        docMap.get(key)!.chunks.push(chunk);
      }

      const sources: ChatSource[] = Array.from(docMap.values()).map((group) => {
        const topSim = Math.max(...group.chunks.map((c) => c.similarity));
        return {
          document: group.document,
          document_id: group.chunks[0].document_id,
          chunksUsed: group.chunks.length,
          topSimilarity: topSim,
        };
      });

      return {
        success: true,
        answer,
        sources,
        chunksUsed: chunks.length,
      };
    } catch (error) {
      console.error("ChatService.chat error:", error);
      throw error;
    }
  }

  /**
   * Summarize a specific document
   */
  static async summarizeDocument(
    documentId: string,
    maxChunks: number = 30,
    supabase?: SupabaseClient
  ): Promise<ChatResponse> {
    try {
      const chunks = await SearchService.getDocumentChunks(documentId, supabase);

      if (!chunks || chunks.length === 0) {
        return {
          success: true,
          answer: "No content found in this document.",
          sources: [],
          chunksUsed: 0,
        };
      }

      // Limit chunks for summarization
      const limitedChunks = chunks.slice(0, maxChunks);
      const fullText = limitedChunks.map((c) => c.content).join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that creates concise, informative summaries of documents. Focus on the main points, key findings, and important details.",
          },
          {
            role: "user",
            content: `Please provide a comprehensive summary of the following document:\n\n${fullText}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      const summary = completion.choices[0]?.message?.content ?? "No summary generated.";

      return {
        success: true,
        answer: summary,
        sources: [
          {
            document: limitedChunks[0].document_title,
            document_id: documentId,
            chunksUsed: limitedChunks.length,
            topSimilarity: 1.0,
          },
        ],
        chunksUsed: limitedChunks.length,
      };
    } catch (error) {
      console.error("ChatService.summarizeDocument error:", error);
      throw error;
    }
  }
}