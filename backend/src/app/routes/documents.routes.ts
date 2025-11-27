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

    // 5. Get validation data if available
    let validationData = null;
    try {
      const { data: contradictions, error: contradictionsError } = await sb
        .from('document_validation')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (contradictionsError) {
        logger.warn('Error fetching validation data:', { error: contradictionsError });
      }

      if (!contradictionsError && contradictions) {
        logger.info('Found validation data for report:', contradictions);
        validationData = {
          contradictions: contradictions.contradictions || [],
          gaps: contradictions.gaps || [],
          agreements: contradictions.agreements || [],
          keyClaims: contradictions.key_claims || [],
          recommendations: contradictions.recommendations || [],
          riskAssessment: contradictions.risk_assessment || null,
          analysisMetadata: {
            documentsAnalyzed: contradictions.documents_analyzed || 1,
            totalChunksReviewed: contradictions.total_chunks_reviewed || 0,
            analysisTimestamp: contradictions.created_at,
            cached: false,
          },
        };
      } else {
        logger.info('No validation data found for this document');
      }
    } catch (err) {
      logger.warn('Failed to fetch validation data for report:', { error: err });
    }

    // 6. Compile report
    const report = {
      document: {
        id: document.id,
        fileName: document.file_name,
        fileType: document.file_type,
        fileSize: document.file_size,
        createdAt: document.created_at,
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

export default router;