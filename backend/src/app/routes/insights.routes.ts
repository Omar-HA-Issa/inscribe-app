import { Router, Request, Response } from 'express';
import { generateDocumentInsights, generateCrossDocumentInsights } from '../../core/services/insights.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/document/:documentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { forceRegenerate } = req.body;
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('🔍 Generating insights for document:', documentId, forceRegenerate ? '(force)' : '(cache-first)');
    const result = await generateDocumentInsights(documentId, userId, forceRegenerate || false);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return res.status(500).json({
      error: 'Failed to generate insights',
      message: error.message,
    });
  }
});

router.post('/cross-document', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentIds, forceRegenerate } = req.body;
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs array is required' });
    }

    console.log('🔍 Generating cross-document insights:', documentIds.length, forceRegenerate ? '(force)' : '(cache-first)');
    const result = await generateCrossDocumentInsights(documentIds, userId, forceRegenerate || false);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error generating cross-document insights:', error);
    return res.status(500).json({
      error: 'Failed to generate insights',
      message: error.message,
    });
  }
});

export default router;