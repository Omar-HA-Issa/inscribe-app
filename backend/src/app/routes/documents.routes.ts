import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { adminClient } from "../../core/clients/supabaseClient";
import { getSummary } from "../../core/services/summary.service";
import { validateUUID } from "../middleware/validation";
import { ValidationError, NotFoundError, UnauthorizedError, InternalServerError } from "../../shared/errors";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import { logger } from "../../shared/utils/logger";
import { SEARCH_CONFIG } from "../../shared/constants/config";

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

    // 3. Get insights
    let insightsList: any[] = [];
    try {
      const { data: rawInsights, error: insightsError } = await sb
        .from('document_insights')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (insightsError) {
        logger.warn('Failed to fetch insights:', { error: insightsError });
      } else {
        // Map database fields to API format
        insightsList = rawInsights?.map((insight: any) => ({
          id: insight.id,
          insight_type: insight.category || 'insight',
          content: insight.description || insight.title || '',
          confidence_score: insight.confidence ? parseFloat(insight.confidence) : undefined,
          created_at: insight.created_at,
        })) || [];
      }
    } catch (err) {
      logger.warn('Error fetching insights:', { error: err });
    }

    logger.info(`Found ${insightsList.length} insights for document ${documentId}`);

    // 4. Get recent chat messages for this document
    // Try both approaches - first with relationship, if that fails, just get messages for user
    let messages = [];
    let messagesError = null;

    // First try: Get messages through conversations relationship
    try {
      const result = await sb
        .from('messages')
        .select(`
          id,
          role,
          content,
          created_at,
          conversation_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!result.error) {
        messages = result.data || [];
      } else {
        messagesError = result.error;
        logger.warn('Failed to fetch messages:', messagesError);
      }
    } catch (err) {
      logger.warn('Error fetching messages:', err);
    }

    logger.info(`Found ${messages.length} total messages`);

    // Filter and format Q&A pairs
    const chatHighlights: Array<{ question: string; answer: string; timestamp: string }> = [];
    if (messages && messages.length > 0) {
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i] as any;
        const nextMsg = messages[i + 1] as any;

        if (msg.role === 'assistant' && nextMsg.role === 'user') {
          chatHighlights.push({
            question: nextMsg.content,
            answer: msg.content,
            timestamp: msg.created_at,
          });

          if (chatHighlights.length >= 5) break;
        }
      }
    }

    logger.info(`Found ${chatHighlights.length} chat highlights`);

    // 5. Get validation data if available
    let validationData = null;
    try {
      const { data: contradictions, error: contradictionsError } = await sb
        .from('contradiction_analysis')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!contradictionsError && contradictions) {
        logger.info('Found validation data for report');
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