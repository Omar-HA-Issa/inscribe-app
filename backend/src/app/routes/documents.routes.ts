import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { adminClient } from "../../core/clients/supabaseClient";
import { getSummary } from "../../core/services/summary.service";
import { validateUUID } from "../middleware/validation";
import { ValidationError, NotFoundError, UnauthorizedError, InternalServerError } from "../../shared/errors";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import { logger } from "../../shared/utils/logger";
import { SEARCH_CONFIG } from "../../shared/constants/config";
import { InsightRepository } from "../../core/repositories/InsightRepository";
import { MessageRepository } from "../../core/repositories/MessageRepository";

const router = Router();
router.use(requireAuth);

// GET /api/documents - Fetch all documents for the authenticated user
router.get("/documents", async (req, res, next) => {
  try {
    const userId = req.authUserId;

    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const sb = adminClient();
    const { data, error } = await sb
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching documents:", { error });
      throw new InternalServerError("Failed to fetch documents");
    }

    res.json({ documents: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/summary - Get or generate document summary
router.get("/documents/:id/summary", async (req, res, next) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { id } = req.params;
    validateUUID(id, "documentId");
    const forceRegenerate = req.query.regenerate === "true";

    const summary = await getSummary(id, userId, forceRegenerate);

    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/report - Generate comprehensive report
router.get("/documents/:id/report", async (req, res, next) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { id: documentId } = req.params;
    validateUUID(documentId, "documentId");
    const sb = adminClient();

    logger.info(`Generating report for document ${documentId}`);

    // 1. Fetch document metadata
    const { data: document, error: docError } = await sb
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      throw new NotFoundError("Document not found");
    }

    // 2. Get summary
    let summary = null;
    try {
      summary = await getSummary(documentId, userId, false);
    } catch (err) {
      logger.warn('Failed to fetch summary for report:', { error: err });
    }

    // 3. Get insights - fetch directly from database
    let insightsList: any[] = [];
    try {
      const { data: rawInsights, error: insightsError } = await sb
        .from('document_insights')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (insightsError) {
        logger.warn('Failed to fetch insights:', { error: insightsError });
      } else if (rawInsights && rawInsights.length > 0) {
        // Extract insights from the insights array inside each row
        rawInsights.forEach((row: any) => {
          if (row.insights && Array.isArray(row.insights)) {
            row.insights.forEach((insight: any, index: number) => {
              insightsList.push({
                id: `${row.id}-${index}`,
                insight_type: insight.category || 'insight',
                content: insight.description || insight.title || 'No content',
                impact: insight.impact || null,
                confidence_score: insight.confidence ?
                  (typeof insight.confidence === 'number' ? insight.confidence :
                   insight.confidence === 'High' ? 0.9 :
                   insight.confidence === 'Medium' ? 0.6 :
                   insight.confidence === 'Low' ? 0.3 : undefined) : undefined,
                created_at: row.created_at,
              });
            });
          }
        });
      }

      logger.info(`Found ${insightsList.length} insights for document ${documentId}`);
    } catch (err) {
      logger.warn('Error fetching insights:', { error: err });
    }

    // 4. Get chat messages for this document
    let chatHighlights: Array<{ question: string; answer: string; timestamp: string }> = [];
    try {
      const messageRepo = new MessageRepository(sb);
      const messages = await messageRepo.findByDocumentId(documentId, 100, 0);

      // Filter messages to find Q&A pairs (assistant responses followed by user questions)
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        const nextMsg = messages[i + 1];

        if (msg.role === 'assistant' && nextMsg.role === 'user') {
          chatHighlights.push({
            question: nextMsg.content,
            answer: msg.content,
            timestamp: msg.createdAt.toISOString(),
          });

          if (chatHighlights.length >= 10) break;
        }
      }

      logger.info(`Found ${chatHighlights.length} chat highlights for document ${documentId}`);
    } catch (err) {
      logger.warn('Error fetching chat messages:', { error: err });
    }

    // 5. Get validation data if available (fetch both within and across types if they exist)
    let validationData: any = null;
    let withinValidation: any = null;
    let acrossValidation: any = null;

    try {
      // Fetch both validation types
      const { data: withinData, error: withinError } = await sb
        .from('document_validation')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .eq('validation_type', 'within')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: acrossData, error: acrossError } = await sb
        .from('document_validation')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .eq('validation_type', 'across')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (withinError) {
        logger.error('Error fetching within validation data:', {
          error: withinError,
          documentId,
          userId,
          message: (withinError as any)?.message
        });
      }

      if (acrossError) {
        logger.error('Error fetching across validation data:', {
          error: acrossError,
          documentId,
          userId,
          message: (acrossError as any)?.message
        });
      }

      // Prepare validation data structure - use 'within' as primary if both exist, otherwise use whichever exists
      if (withinData || acrossData) {
        const primaryValidation = withinData || acrossData;

        logger.info('Found validation data for report', {
          documentId,
          userId,
          hasWithinValidation: !!withinData,
          hasAcrossValidation: !!acrossData,
          withinContradictions: withinData?.contradictions?.length || 0,
          withinGaps: withinData?.gaps?.length || 0,
          acrossContradictions: acrossData?.contradictions?.length || 0,
          acrossGaps: acrossData?.gaps?.length || 0,
        });

        // Store both validation types if they exist
        validationData = {
          contradictions: primaryValidation.contradictions || [],
          gaps: primaryValidation.gaps || [],
          agreements: primaryValidation.agreements || [],
          keyClaims: primaryValidation.key_claims || [],
          recommendations: primaryValidation.recommendations || [],
          riskAssessment: primaryValidation.risk_assessment || null,
          analysisMetadata: {
            documentsAnalyzed: primaryValidation.documents_analyzed || 1,
            totalChunksReviewed: primaryValidation.total_chunks_reviewed || 0,
            analysisTimestamp: primaryValidation.created_at,
            cached: false,
          },
          // Include both validation types for frontend selection
          withinValidation: withinData ? {
            contradictions: withinData.contradictions || [],
            gaps: withinData.gaps || [],
            agreements: withinData.agreements || [],
            keyClaims: withinData.key_claims || [],
            recommendations: withinData.recommendations || [],
            riskAssessment: withinData.risk_assessment || null,
            analysisMetadata: {
              documentsAnalyzed: withinData.documents_analyzed || 1,
              totalChunksReviewed: withinData.total_chunks_reviewed || 0,
              analysisTimestamp: withinData.created_at,
              cached: false,
            },
          } : null,
          acrossValidation: acrossData ? {
            contradictions: acrossData.contradictions || [],
            gaps: acrossData.gaps || [],
            agreements: acrossData.agreements || [],
            keyClaims: acrossData.key_claims || [],
            recommendations: acrossData.recommendations || [],
            riskAssessment: acrossData.risk_assessment || null,
            analysisMetadata: {
              documentsAnalyzed: acrossData.documents_analyzed || 1,
              totalChunksReviewed: acrossData.total_chunks_reviewed || 0,
              analysisTimestamp: acrossData.created_at,
              cached: false,
            },
          } : null,
        };
      } else {
        logger.info('No validation data found for this document', {
          documentId,
          userId
        });
      }
    } catch (err) {
      logger.error('Failed to fetch validation data for report:', {
        error: err,
        message: (err as any)?.message,
        documentId,
        userId
      });
    }

    // 6. Compile report
    // Get total chunks for this document
    const { data: chunks, error: chunksError } = await sb
      .from('document_chunks')
      .select('id')
      .eq('document_id', documentId);

    const totalChunks = !chunksError && chunks ? chunks.length : 0;

    const report = {
      document: {
        id: document.id,
        fileName: document.file_name,
        fileType: document.file_type,
        fileSize: document.file_size,
        createdAt: document.created_at,
        totalChunks: totalChunks,
        metadata: document.metadata,
      },
      summary: summary || null,
      insights: insightsList,
      chatHighlights: chatHighlights.reverse(), // Show oldest to newest
      validation: validationData,
      generatedAt: new Date().toISOString(),
    };

    logger.info(`Report compiled:`, {
      hasSummary: !!summary,
      insightCount: insightsList.length,
      chatHighlightCount: chatHighlights.length,
      hasValidation: !!validationData,
      validationContradictions: validationData?.contradictions?.length || 0,
      validationGaps: validationData?.gaps?.length || 0,
      validationRecommendations: validationData?.recommendations?.length || 0,
    });
    logger.info(`Report generated successfully`);
    return res.json(report);
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/documents/:id - Delete a document and its chunks
router.delete("/documents/:id", rateLimitMiddleware.default, async (req, res, next) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { id } = req.params;
    validateUUID(id, "documentId");
    const sb = adminClient();

    // Delete chunks first (foreign key constraint)
    const { error: chunksError } = await sb
      .from("document_chunks")
      .delete()
      .eq("document_id", id);

    if (chunksError) {
      logger.error("Error deleting chunks:", { error: chunksError });
      throw new InternalServerError("Failed to delete document chunks");
    }

    // Delete document (with user ownership check)
    const { error: docError } = await sb
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (docError) {
      logger.error("Error deleting document:", { error: docError });
      throw new InternalServerError("Failed to delete document");
    }

    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/preferences - Save report preferences for a document
router.post("/documents/:id/preferences", async (req, res, next) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { id: documentId } = req.params;
    validateUUID(documentId, "documentId");

    const { enabledSections, hiddenInsights, hiddenValidationItems } = req.body;

    const sb = adminClient();

    // Upsert preferences into database
    const { error: prefsError } = await sb
      .from('report_preferences')
      .upsert({
        document_id: documentId,
        user_id: userId,
        enabled_sections: enabledSections || [],
        hidden_insights: hiddenInsights || [],
        hidden_validation_items: hiddenValidationItems || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'document_id,user_id'
      });

    if (prefsError) {
      logger.warn('Failed to save preferences:', { error: prefsError });
      throw new InternalServerError('Failed to save preferences');
    }

    logger.info(`Saved preferences for document ${documentId}`);
    res.json({ success: true, message: 'Preferences saved' });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/preferences - Get report preferences for a document
router.get("/documents/:id/preferences", async (req, res, next) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { id: documentId } = req.params;
    validateUUID(documentId, "documentId");

    const sb = adminClient();

    const { data: preferences, error: prefsError } = await sb
      .from('report_preferences')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .single();

    if (prefsError) {
      // No preferences found is not an error, return empty defaults
      logger.info(`No preferences found for document ${documentId}`);
      return res.json({
        enabledSections: [],
        hiddenInsights: [],
        hiddenValidationItems: [],
      });
    }

    res.json({
      enabledSections: preferences.enabled_sections || [],
      hiddenInsights: preferences.hidden_insights || [],
      hiddenValidationItems: preferences.hidden_validation_items || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;