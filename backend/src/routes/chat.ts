import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { ChatService } from "../services/chatService";
import { adminClient } from "../lib/supabase";

const router = Router();
router.use(requireAuth);

/**
 * POST /api/chat
 * Body: { question: string, selectedDocumentIds?: string[], topK?: number, similarityThreshold?: number }
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const userId: string | null = req.authUserId ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      question,
      selectedDocumentIds,
      topK = 6,
      similarityThreshold = 0.15,
    } = req.body || {};

    // 🔍 DEBUG LOGGING
    console.log('\n====== CHAT REQUEST ======');
    console.log('User ID:', userId);
    console.log('Question:', question);
    console.log('Selected Document IDs:', selectedDocumentIds);
    console.log('TopK:', topK);
    console.log('Similarity Threshold:', similarityThreshold);
    console.log('==========================\n');

    if (!question || typeof question !== "string") {
      return res.status(400).json({ success: false, message: "Missing question" });
    }

    // Get user-scoped Supabase client (with RLS)
    const sb = adminClient();

    // Use ChatService with optional document filtering
    const response = await ChatService.chat(
      question,
      topK,
      similarityThreshold,
      selectedDocumentIds,
      sb
    );

    // 🔍 DEBUG LOGGING
    console.log('\n====== CHAT RESPONSE ======');
    console.log('Success:', response.success);
    console.log('Chunks Used:', response.chunksUsed);
    console.log('Sources:', response.sources.length);
    console.log('Answer Preview:', response.answer.substring(0, 100) + '...');
    console.log('===========================\n');

    return res.json(response);
  } catch (err: any) {
    console.error("Chat error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Chat failed" });
  }
});

/**
 * POST /api/chat/summarize/:documentId
 * Summarize a specific document
 */
router.post("/summarize/:documentId", async (req: Request, res: Response) => {
  try {
    const userId: string | null = req.authUserId ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { documentId } = req.params;
    const { maxChunks = 30 } = req.body || {};

    console.log('\n====== SUMMARIZE REQUEST ======');
    console.log('Document ID:', documentId);
    console.log('Max Chunks:', maxChunks);
    console.log('================================\n');

    const sb = adminClient();
    const response = await ChatService.summarizeDocument(documentId, maxChunks, sb);

    return res.json(response);
  } catch (err: any) {
    console.error("Summarize error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Summarization failed" });
  }
});

export default router;