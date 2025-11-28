import { Router, Request, Response } from 'express';
import * as ValidationService from '../../core/services/validation.service';
import { adminClient } from '../../core/clients/supabaseClient';
import { validateUUID } from '../middleware/validation';
import { UnauthorizedError, BadRequestError, InternalServerError } from '../../shared/errors';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth.middleware';
import { logger } from '../../shared/utils/logger';

const router = Router();

/**
 * POST /api/validation/analyze/within
 * Detect validation issues within a single document
 */
router.post('/analyze/within', requireAuth, rateLimitMiddleware.default, async (req: Request, res: Response, next) => {
  try {
    const { documentId, forceRegenerate } = req.body;
    const userId = (req as any).authUserId;

    if (!documentId) {
      throw new BadRequestError('Document ID is required');
    }

    validateUUID(documentId, 'documentId');

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    logger.info(`Analyzing document ${documentId} for validation issues`);

    // Check if cached result exists (unless force regenerate)
    if (!forceRegenerate) {
      const sb = adminClient();
      const { data: cachedValidation, error: fetchError } = await sb
        .from('document_validation')
        .select('*')
        .eq('document_id', documentId)
        .eq('validation_type', 'within')
        .eq('user_id', userId)
        .single();

      if (!fetchError && cachedValidation) {
        logger.info('Returning cached validation results from database');
        return res.json({
          contradictions: cachedValidation.contradictions,
          gaps: cachedValidation.gaps,
          agreements: cachedValidation.agreements,
          keyClaims: cachedValidation.key_claims,
          recommendations: cachedValidation.recommendations,
          riskAssessment: cachedValidation.risk_assessment,
          analysisMetadata: {
            documentsAnalyzed: cachedValidation.documents_analyzed,
            totalChunksReviewed: cachedValidation.total_chunks_reviewed,
            analysisTimestamp: cachedValidation.created_at,
            cached: true,
          },
        });
      }
    }

    const result = await ValidationService.detectWithinDocument(documentId, userId);

    logger.info(
      `Found ${result.contradictions.length} contradictions and ${result.gaps.length} gaps`
    );

    // Save validation results to database
    const sb = adminClient();
    const { error: saveError } = await sb
      .from('document_validation')
      .upsert({
        document_id: documentId,
        user_id: userId,
        validation_type: 'within',
        compared_document_ids: [],
        contradictions: result.contradictions,
        gaps: result.gaps,
        agreements: result.agreements,
        key_claims: result.keyClaims,
        recommendations: result.recommendations,
        risk_assessment: result.riskAssessment,
        documents_analyzed: result.analysisMetadata.documentsAnalyzed,
        total_chunks_reviewed: result.analysisMetadata.totalChunksReviewed,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'document_id,validation_type'
      });

    if (saveError) {
      logger.warn('Failed to save validation results:', { error: saveError });
    } else {
      logger.info('Validation results saved to database');
    }

    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/validation/analyze/across
 * Detect validation issues between documents
 */
router.post('/analyze/across', requireAuth, rateLimitMiddleware.default, async (req: Request, res: Response, next) => {
  try {
    const { primaryDocumentId, compareDocumentIds, forceRegenerate } = req.body;
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

    // Check if cached result exists (unless force regenerate)
    if (!forceRegenerate) {
      const sb = adminClient();
      const { data: cachedValidation, error: fetchError } = await sb
        .from('document_validation')
        .select('*')
        .eq('document_id', primaryDocumentId)
        .eq('validation_type', 'across')
        .eq('user_id', userId)
        .contains('compared_document_ids', compareDocumentIds)
        .single();

      if (!fetchError && cachedValidation) {
        logger.info('Returning cached validation results from database');
        return res.json({
          contradictions: cachedValidation.contradictions,
          gaps: cachedValidation.gaps,
          agreements: cachedValidation.agreements,
          keyClaims: cachedValidation.key_claims,
          recommendations: cachedValidation.recommendations,
          riskAssessment: cachedValidation.risk_assessment,
          analysisMetadata: {
            documentsAnalyzed: cachedValidation.documents_analyzed,
            totalChunksReviewed: cachedValidation.total_chunks_reviewed,
            analysisTimestamp: cachedValidation.created_at,
            cached: true,
          },
        });
      }
    }

    const result = await ValidationService.detectAcrossDocuments(
      primaryDocumentId,
      compareDocumentIds,
      userId
    );

    logger.info(
      `Found ${result.contradictions.length} contradictions and ${result.gaps.length} gaps across documents`
    );

    // Save validation results to database
    const sb = adminClient();
    const { error: saveError } = await sb
      .from('document_validation')
      .insert({
        document_id: primaryDocumentId,
        user_id: userId,
        validation_type: 'across',
        compared_document_ids: compareDocumentIds,
        contradictions: result.contradictions,
        gaps: result.gaps,
        agreements: result.agreements,
        key_claims: result.keyClaims,
        recommendations: result.recommendations,
        risk_assessment: result.riskAssessment,
        documents_analyzed: result.analysisMetadata.documentsAnalyzed,
        total_chunks_reviewed: result.analysisMetadata.totalChunksReviewed,
      });

    if (saveError) {
      logger.warn('Failed to save validation results:', { error: saveError });
    } else {
      logger.info('Validation results saved to database');
    }

    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

export default router;