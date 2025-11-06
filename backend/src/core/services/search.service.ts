import type { SupabaseClient } from "@supabase/supabase-js";
import { openaiConfig } from "../config/openai.config";
import { getSupabase, supabaseForUser } from "../config/supabase.config";

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

export class SearchService {
  /** Embed a user query (used by vector search) */
  static async embedQuery(query: string): Promise<number[]> {
    const resp = await openaiConfig.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    return resp.data[0].embedding as unknown as number[];
  }

  /**
   * Vector search via RPC (joined to documents) with optional doc filters.
   */
  static async search(
      query: string,
      limit: number = 5,
      similarityThreshold: number = 0.5,
      selectedDocumentIds?: string[],
      sb?: SupabaseClient
  ): Promise<SearchResult[]> {
    const supabase = sb ?? getSupabase();
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 50);
    const safeThreshold = Math.max(0, Math.min(1, similarityThreshold ?? 0.5));

    console.log('🔍 SearchService.search called:');
    console.log('  Query:', query);
    console.log('  Limit:', safeLimit);
    console.log('  Threshold:', safeThreshold);
    console.log('  Selected IDs:', selectedDocumentIds);

    const queryEmbedding = await this.embedQuery(query);

    const rpcParams: any = {
      query_embedding: queryEmbedding,
      match_threshold: safeThreshold,
      match_count: safeLimit,
    };

    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      rpcParams.only_document_ids = selectedDocumentIds;
    }

    const {data, error} = await supabase.rpc("match_document_chunks", rpcParams);

    if (error) {
      console.error('❌ Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }

    const rows = (data ?? []) as any[];
    console.log('✅ SearchService returned:', rows.length, 'chunks');

    return rows.map((r) => ({
      chunk_id: r.id,
      document_id: r.document_id,
      document_title:
          (r.document_title && String(r.document_title).trim()) ||
          (r.document_file_name && String(r.document_file_name).trim()) ||
          "Unknown Document",
      content: r.content,
      chunk_index: r.chunk_index,
      similarity: typeof r.similarity === "number" ? r.similarity : 0,
    }));
  }

  static async getDocumentChunks(
    documentId: string,
    sb?: SupabaseClient
  ): Promise<SearchResult[]> {
    const supabase = sb ?? getSupabase();

    const { data, error } = await supabase
      .from("document_chunks")
      .select(`
        id,
        document_id,
        content,
        chunk_index,
        documents ( title, file_name )
      `)
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    if (error) {
      console.error("Get document chunks error:", error);
      throw error;
    }

    const rows = (data ?? []) as any[];
    return rows.map((chunk) => ({
      chunk_id: chunk.id,
      document_id: chunk.document_id,
      document_title:
        (chunk.documents?.title && String(chunk.documents.title).trim()) ||
        (chunk.documents?.file_name && String(chunk.documents.file_name).trim()) ||
        "Unknown Document",
      content: chunk.content,
      chunk_index: chunk.chunk_index,
      similarity: 1.0,
    }));
  }
}
