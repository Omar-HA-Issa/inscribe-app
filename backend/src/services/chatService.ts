import type { SupabaseClient } from "@supabase/supabase-js";
import { openai } from "../config/openai";
import { SearchService, SearchResult } from "./searchService";

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
   * General QA over selected docs (or all docs if none selected).
   * `sb` can be a user-scoped Supabase client (RLS).
   */
  static async chat(
    query: string,
    limit: number = 5,
    similarityThreshold: number = 0.5,
    selectedDocumentIds?: string[],
    sb?: SupabaseClient
  ): Promise<ChatResponse> {
    // 1) Retrieve relevant chunks
    const searchResults = await SearchService.search(
      query,
      limit,
      similarityThreshold,
      selectedDocumentIds,
      sb
    );

    if (searchResults.length === 0) {
      return {
        success: true,
        answer:
          "I couldn't find relevant information within the selected documents. Try adjusting your selection or rephrasing the query.",
        sources: [],
        chunksUsed: 0,
      };
    }

    // 2) Build ordered context
    const topContext = [...searchResults]
      .sort((a, b) => b.similarity - a.similarity)
      .map(
        (r) =>
          `Document: ${r.document_title}\n` +
          `Chunk #${r.chunk_index} (similarity ${(r.similarity * 100).toFixed(1)}%)\n` +
          `---\n${r.content}`
      )
      .join("\n\n====================\n\n");

    // 3) Prompts
    const systemPrompt =
      "You are a helpful assistant that answers using ONLY the provided context. " +
      "If the answer is not present, say you don't know. Be concise and factual.";
    const userPrompt = `Question: ${query}\n\nContext:\n${topContext}`;

    // 4) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "I don't know.";

    // 5) Group sources per document
    const byDoc = new Map<string, { title: string; count: number; topSim: number }>();
    for (const r of searchResults) {
      const id = String(r.document_id);
      const title = (r.document_title || "").trim() || "Unknown Document";
      const entry = byDoc.get(id) || { title, count: 0, topSim: 0 };
      entry.count += 1;
      entry.topSim = Math.max(entry.topSim, r.similarity || 0);
      byDoc.set(id, entry);
    }

    const sources = Array.from(byDoc.entries()).map(([document_id, v]) => ({
      document: v.title,
      document_id,
      chunksUsed: v.count,
      topSimilarity: v.topSim,
    }));

    return {
      success: true,
      answer,
      sources,
      chunksUsed: searchResults.length,
    };
  }

  /**
   * Single-document summarization (ordered chunks, capped).
   */
  static async summarizeDocument(
    documentId: string,
    maxChunks: number = 30,
    sb?: SupabaseClient
  ): Promise<ChatResponse> {
    const chunks = await SearchService.getDocumentChunks(documentId, sb);
    if (chunks.length === 0) {
      return {
        success: false,
        answer: "No content found for that document.",
        sources: [],
        chunksUsed: 0,
      };
    }

    const limited = chunks.slice(0, maxChunks);
    const context = limited
      .map((c) => `Chunk #${c.chunk_index}\n---\n${c.content}`)
      .join("\n\n====================\n\n");

    const docTitle = (chunks[0].document_title || "Selected Document").trim();

    const systemPrompt =
      "You are a precise summarizer. Create a faithful summary using ONLY the provided content. Do not invent details.";
    const userPrompt =
      `Summarize the document "${docTitle}". Focus on:\n` +
      `- Key themes/topics\n- Main arguments/points\n- Any contradictions or open questions\n\n` +
      `Context:\n${context}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "I couldn't generate a summary.";

    return {
      success: true,
      answer,
      sources: [
        {
          document: docTitle,
          document_id: documentId,
          chunksUsed: limited.length,
          topSimilarity: 1.0,
        } as ChatSource,
      ],
      chunksUsed: limited.length,
    };
  }
}
