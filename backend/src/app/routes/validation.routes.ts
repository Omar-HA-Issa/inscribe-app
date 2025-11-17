import { Router, Request, Response } from 'express';
import * as ContradictionsService from '../../core/services/validation.service';

const router = Router();

/**
 * POST /api/contradictions/analyze/within
 * Detect contradictions within a single document
 */
router.post('/analyze/within', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.body;
    const userId = (req as any).authUserId;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`[Contradictions] Analyzing document ${documentId} for user ${userId}`);

    const result = await ContradictionsService.detectWithinDocument(documentId, userId);

    console.log(
      `[Contradictions] Found ${result.contradictions.length} contradictions and ${result.gaps.length} gaps`
    );

    res.json(result);
  } catch (error: any) {
    console.error('[Contradictions] Error analyzing document:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze document' });
  }
});

/**
 * POST /api/contradictions/analyze/across
 * Detect contradictions between documents
 */
router.post('/analyze/across', async (req: Request, res: Response) => {
  try {
    const { primaryDocumentId, compareDocumentIds } = req.body;
    const userId = (req as any).authUserId;

    if (!primaryDocumentId || !compareDocumentIds || !Array.isArray(compareDocumentIds)) {
      return res.status(400).json({
        error: 'Primary document ID and array of comparison document IDs are required',
      });
    }

    if (compareDocumentIds.length === 0) {
      return res.status(400).json({ error: 'At least one comparison document is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(
      `[Contradictions] Comparing document ${primaryDocumentId} with ${compareDocumentIds.length} other documents`
    );

    const result = await ContradictionsService.detectAcrossDocuments(
      primaryDocumentId,
      compareDocumentIds,
      userId
    );

    console.log(
      `[Contradictions] Found ${result.contradictions.length} contradictions and ${result.gaps.length} gaps across documents`
    );

    res.json(result);
  } catch (error: any) {
    console.error('[Contradictions] Error comparing documents:', error);
    res.status(500).json({ error: error.message || 'Failed to compare documents' });
  }
});

export default router;