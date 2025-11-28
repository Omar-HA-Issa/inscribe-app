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

    // First, try to update existing record
    const { data: existing, error: checkError } = await sb
      .from('document_validation')
      .select('id')
      .eq('document_id', documentId)
      .eq('validation_type', 'within')
      .eq('user_id', userId)
      .maybeSingle();

    let saveError = null;

    if (existing) {
      // Update existing record
      const { error: updateError } = await sb
        .from('document_validation')
        .update({
          contradictions: result.contradictions,
          gaps: result.gaps,
          agreements: result.agreements,
          key_claims: result.keyClaims,
          recommendations: result.recommendations,
          risk_assessment: result.riskAssessment,
          documents_analyzed: result.analysisMetadata.documentsAnalyzed,
          total_chunks_reviewed: result.analysisMetadata.totalChunksReviewed,
          updated_at: new Date().toISOString(),
        })
        .eq('document_id', documentId)
        .eq('validation_type', 'within')
        .eq('user_id', userId);

      saveError = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await sb
        .from('document_validation')
        .insert({
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
        });

      saveError = insertError;
    }

    if (saveError) {
      logger.error('Failed to save validation results:', {
        error: saveError,
        message: (saveError as any)?.message,
        documentId,
        userId
      });
    } else {
      logger.info('Validation results saved to database', {
        documentId,
        userId,
        contradictionsCount: result.contradictions.length,
        gapsCount: result.gaps.length,
        recommendationsCount: result.recommendations.length,
        riskLevel: result.riskAssessment.overallRisk
      });
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
      const { data: cachedValidations, error: fetchError } = await sb
        .from('document_validation')
        .select('*')
        .eq('document_id', primaryDocumentId)
        .eq('validation_type', 'across')
        .eq('user_id', userId);

      if (!fetchError && cachedValidations && cachedValidations.length > 0) {
        // Sort both arrays to handle different ordering
        const sortedCompareIds = [...compareDocumentIds].sort();

        // Find a matching cached result with the same document IDs (regardless of order)
        const cachedValidation = cachedValidations.find(validation => {
          const storedCompareIds = (validation.compared_document_ids || []).sort();
          return JSON.stringify(sortedCompareIds) === JSON.stringify(storedCompareIds);
        });

        if (cachedValidation) {
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

    // For across analysis, we need to handle multiple records with same primary doc
    // So we store with sorted document IDs for consistency and check for existing records
    const sortedCompareIds = [...compareDocumentIds].sort();

    // First, try to find existing record with same documents
    const { data: existing, error: checkError } = await sb
      .from('document_validation')
      .select('id')
      .eq('document_id', primaryDocumentId)
      .eq('validation_type', 'across')
      .eq('user_id', userId)
      .maybeSingle();

    let saveError = null;

    if (existing) {
      // Update existing record
      const { error: updateError } = await sb
        .from('document_validation')
        .update({
          compared_document_ids: sortedCompareIds,
          contradictions: result.contradictions,
          gaps: result.gaps,
          agreements: result.agreements,
          key_claims: result.keyClaims,
          recommendations: result.recommendations,
          risk_assessment: result.riskAssessment,
          documents_analyzed: result.analysisMetadata.documentsAnalyzed,
          total_chunks_reviewed: result.analysisMetadata.totalChunksReviewed,
          updated_at: new Date().toISOString(),
        })
        .eq('document_id', primaryDocumentId)
        .eq('validation_type', 'across')
        .eq('user_id', userId);

      saveError = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await sb
        .from('document_validation')
        .insert({
          document_id: primaryDocumentId,
          user_id: userId,
          validation_type: 'across',
          compared_document_ids: sortedCompareIds,
          contradictions: result.contradictions,
          gaps: result.gaps,
          agreements: result.agreements,
          key_claims: result.keyClaims,
          recommendations: result.recommendations,
          risk_assessment: result.riskAssessment,
          documents_analyzed: result.analysisMetadata.documentsAnalyzed,
          total_chunks_reviewed: result.analysisMetadata.totalChunksReviewed,
        });

      saveError = insertError;
    }

    if (saveError) {
      logger.error('Failed to save validation results:', {
        error: saveError,
        message: (saveError as any)?.message,
        primaryDocumentId,
        userId,
        compareDocumentIds
      });
    } else {
      logger.info('Validation results saved to database', {
        primaryDocumentId,
        userId,
        compareDocumentIds,
        contradictionsCount: result.contradictions.length,
        gapsCount: result.gaps.length,
        recommendationsCount: result.recommendations.length,
        riskLevel: result.riskAssessment.overallRisk
      });
    }

    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

export default router;