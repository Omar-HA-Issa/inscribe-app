import { Router } from "express";
import type { Request } from "express";
import supabase from "../lib/supabase";
import { EmbeddingService } from "../services/embeddingService";
// import { authRequired } from "../middleware/auth";

const r = Router();

/**
 * BODY: { query: string, topK?: number, minSimilarity?: number }
 */
r.post("/search", /* authRequired, */ async (req: Request, res) => {
  try {
    const userId: string | null = (req as any).user?.id ?? null;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { query, topK = 8, minSimilarity = 0.2 } = req.body || {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, message: "Missing query" });
    }

    // 1) embed query
    const [[...qvec]] = await EmbeddingService.generateEmbeddings([query]); // STATIC (fix)

    // 2) call RPC for vector similarity (create SQL function below)
    const sb = supabase();
    const { data, error } = await sb.rpc("match_document_chunks", {
      p_user_id: userId,
      p_query_embedding: qvec as unknown as number[],
      p_match_count: topK,
      p_min_similarity: minSimilarity,
    });

    if (error) {
      console.error("search rpc error:", error);
      return res.status(500).json({ success: false, message: "Search failed" });
    }

    return res.json({ success: true, results: data ?? [] });
  } catch (err: any) {
    console.error("search error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
});

export default r;
