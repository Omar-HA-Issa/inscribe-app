import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { ChatService } from "../../core/services/chat.service";
import { adminClient } from "../../core/clients/supabaseClient";
import { validateQuestion, validateNumber, validateUUID } from "../middleware/validation";
import { ValidationError, UnauthorizedError, BadRequestError, InternalServerError } from "../../shared/errors";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import { logger } from "../../shared/utils/logger";
import { SEARCH_CONFIG } from "../../shared/constants/config";

const router = Router();
router.use(requireAuth);

/**
 * POST /api/chat
 * Body: { question: string, selectedDocumentIds?: string[], topK?: number, similarityThreshold?: number }
 */
router.post("/chat", rateLimitMiddleware.chat, async (req: Request, res: Response, next) => {
  try {
    const userId: string | null = req.authUserId ?? null;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const {
      question,
      selectedDocumentIds,
      topK = 6,
      similarityThreshold = 0.15,
    } = req.body || {};

    // Validate inputs
    validateQuestion(question);
    const validTopK = validateNumber(topK, "topK", 1, SEARCH_CONFIG.MAX_TOP_K);
    const validThreshold = validateNumber(similarityThreshold, "similarityThreshold", 0, 1);

    // Validate document IDs if provided
    if (selectedDocumentIds && Array.isArray(selectedDocumentIds)) {
      selectedDocumentIds.forEach((docId, index) => {
        validateUUID(docId, `selectedDocumentIds[${index}]`);
      });
    }

    logger.info(`Chat request from user ${userId}, question length: ${question.length}`);

    // Get user-scoped Supabase client (with RLS)
    const sb = adminClient();

    // Use ChatService with optional document filtering
    const response = await ChatService.chat(
      question,
      validTopK,
      validThreshold,
      selectedDocumentIds,
      sb,
      userId
    );

    logger.info(`Chat response generated with ${response.chunksUsed} chunks used`);

    return res.json(response);
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/chat/summarize/:documentId
 * Summarize a specific document
 */
router.post("/summarize/:documentId", rateLimitMiddleware.chat, async (req: Request, res: Response, next) => {
  try {
    const userId: string | null = req.authUserId ?? null;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { documentId } = req.params;
    validateUUID(documentId, "documentId");

    const { maxChunks = SEARCH_CONFIG.DEFAULT_MAX_CHUNKS } = req.body || {};
    const validMaxChunks = validateNumber(maxChunks, "maxChunks", 1, 100);

    logger.info(`Summarize request for document ${documentId}, maxChunks: ${validMaxChunks}`);

    const sb = adminClient();
    const response = await ChatService.summarizeDocument(documentId, validMaxChunks, sb);

    return res.json(response);
  } catch (err: any) {
    next(err);
  }
});

export default router;