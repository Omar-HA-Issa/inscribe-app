import { Router, Request, Response } from 'express';
import * as ContradictionsService from '../../core/services/validation.service';
import { validateUUID } from '../middleware/validation';
import { UnauthorizedError, BadRequestError, InternalServerError } from '../../shared/errors';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth.middleware';
import { logger } from '../../shared/utils/logger';

const router = Router();

/**
 * POST /api/contradictions/analyze/within
 * Detect contradictions within a single document
 */
router.post('/analyze/within', requireAuth, rateLimitMiddleware.default, async (req: Request, res: Response, next) => {
  try {
    const { documentId } = req.body;
    const userId = (req as any).authUserId;

    if (!documentId) {
      throw new BadRequestError('Document ID is required');
    }

    validateUUID(documentId, 'documentId');

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    logger.info(`Analyzing document ${documentId} for contradictions`);

    const result = await ContradictionsService.detectWithinDocument(documentId, userId);

    logger.info(
      `Found ${result.contradictions.length} contradictions and ${result.gaps.length} gaps`
    );

    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/contradictions/analyze/across
 * Detect contradictions between documents
 */
router.post('/analyze/across', requireAuth, rateLimitMiddleware.default, async (req: Request, res: Response, next) => {
  try {
    const { primaryDocumentId, compareDocumentIds } = req.body;
    const userId = (req as any).authUserId;

    if (!primaryDocumentId || !compareDocumentIds || !Array.isArray(compareDocumentIds)) {
      throw new BadRequestError('Primary document ID and array of comparison document IDs are required');
    }

    validateUUID(primaryDocumentId, 'primaryDocumentId');

    if (compareDocumentIds.length === 0) {
      throw new BadRequestError('At least one comparison document is required');
    }

    // Validate all comparison document IDs
    compareDocumentIds.forEach((docId, index) => {
      validateUUID(docId, `compareDocumentIds[${index}]`);
    });

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    logger.info(
      `Comparing document ${primaryDocumentId} with ${compareDocumentIds.length} other documents`
    );

    const result = await ContradictionsService.detectAcrossDocuments(
      primaryDocumentId,
      compareDocumentIds,
      userId
    );

    logger.info(
      `Found ${result.contradictions.length} contradictions and ${result.gaps.length} gaps across documents`
    );

    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

export default router;