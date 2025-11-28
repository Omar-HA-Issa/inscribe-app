import { Router } from "express";
import type { Request } from "express";
import { EmbeddingService } from "../../core/services/embedding.service";
import {adminClient} from "../../core/clients/supabaseClient";
import { requireAuth  } from "../middleware/auth.middleware";
import { validateQuestion, validateNumber } from "../middleware/validation";
import { ValidationError, UnauthorizedError, BadRequestError, InternalServerError } from "../../shared/errors";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import { logger } from "../../shared/utils/logger";
import { SEARCH_CONFIG } from "../../shared/constants/config";

const router = Router();
router.use(requireAuth);

router.post("/search", rateLimitMiddleware.default, async (req: Request, res, next) => {
  try {
    const userId: string | null = req.authUserId ?? null;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { query, topK = 8, minSimilarity = 0.2 } = req.body || {};

    // Validate inputs
    validateQuestion(query);
    const validTopK = validateNumber(topK, "topK", 1, SEARCH_CONFIG.MAX_TOP_K);
    const validMinSimilarity = validateNumber(minSimilarity, "minSimilarity", 0, 1);

    const [[...qvec]] = await EmbeddingService.generateEmbeddings([query]);

    const sb = adminClient();
    const { data, error } = await sb.rpc("match_document_chunks", {
      query_embedding: qvec as unknown as number[],
      match_threshold: validMinSimilarity,
      match_count: validTopK,
      only_document_ids: null,
    });

    if (error) {
      logger.error("Search RPC error:", { error });
      throw new InternalServerError("Search failed");
    }

    return res.json({ success: true, results: data ?? [] });
  } catch (err: any) {
    next(err);
  }
});

export default router;