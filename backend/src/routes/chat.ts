import { Router } from "express";
import type { Request } from "express";
import supabase from "../lib/supabase";
import { EmbeddingService } from "../services/embeddingService";
import OpenAI from "openai";
// import { authRequired } from "../middleware/auth";

const r = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * BODY: { question: string, topK?: number }
 * Returns an answer using RAG over user's chunks.
 */
r.post("/chat", /* authRequired, */ async (req: Request, res) => {
  try {
    const userId: string | null = (req as any).user?.id ?? null;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { question, topK = 6 } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ success: false, message: "Missing question" });
    }

    // 1) embed query
    const [[...qvec]] = await EmbeddingService.generateEmbeddings([question]); // STATIC (fix)

    // 2) retrieve top contexts via RPC
    const sb = supabase();
    const { data: matches, error } = await sb.rpc("match_document_chunks", {
      p_user_id: userId,
      p_query_embedding: qvec as unknown as number[],
      p_match_count: topK,
      p_min_similarity: 0.2,
    });
    if (error) {
      console.error("chat rpc error:", error);
      return res.status(500).json({ success: false, message: "Context retrieval failed" });
    }

    const context = (matches || [])
      .map((m: any, i: number) => `[[Chunk ${i + 1} | doc:${m.document_id} | sim:${m.similarity.toFixed(3)}]]\n${m.content}`)
      .join("\n\n");

    // 3) generate answer
    const prompt = `
You are a helpful assistant. Answer the user's question using ONLY the provided context. 
If the answer isn't in the context, say you don't have enough information.

# Context
${context}

# Question
${question}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const answer = completion.choices[0]?.message?.content ?? "Sorry, no answer.";
    return res.json({ success: true, answer, sources: matches ?? [] });
  } catch (err: any) {
    console.error("chat error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Chat failed" });
  }
});

export default r;
