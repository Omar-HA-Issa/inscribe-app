import { Router, Request, Response } from 'express';
import {
  generateDocumentInsights,
  generateCrossDocumentInsights,
} from '../../core/services/insights.service';
import { requireAuth } from '../middleware/auth.middleware';
import { validateUUID } from '../middleware/validation';
import { UnauthorizedError, BadRequestError, InternalServerError } from '../../shared/errors';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { logger } from '../../shared/utils/logger';

const router = Router();

router.post('/document/:documentId', requireAuth, rateLimitMiddleware.default, async (req: Request, res: Response, next) => {
  try {
    const { documentId } = req.params;
    validateUUID(documentId, 'documentId');
    const { forceRegenerate } = req.body;
    const userId = req.authUserId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    logger.info(
      `Generating insights for document: ${documentId} ${forceRegenerate ? '(force regenerate)' : '(cache-first)'}`
    );

    const result = await generateDocumentInsights(documentId, userId, forceRegenerate || false);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
});

router.post('/cross-document', requireAuth, rateLimitMiddleware.default, async (req: Request, res: Response, next) => {
  try {
    const { documentIds, forceRegenerate } = req.body;
    const userId = req.authUserId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      throw new BadRequestError('documentIds must be a non-empty array');
    }

    // Validate all document IDs
    documentIds.forEach((docId, index) => {
      validateUUID(docId, `documentIds[${index}]`);
    });

    logger.info(
      `Generating cross-document insights: ${documentIds.length} docs ${forceRegenerate ? '(force regenerate)' : '(cache-first)'}`
    );
    const result = await generateCrossDocumentInsights(
      documentIds,
      userId,
      forceRegenerate || false
    );
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
});

export default router;
