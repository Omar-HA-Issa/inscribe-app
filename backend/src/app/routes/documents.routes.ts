import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { adminClient } from "../../core/clients/supabaseClient";
import { getSummary } from "../../core/services/summary.service";

const router = Router();
router.use(requireAuth);

// GET /api/documents - Fetch all documents for the authenticated user
router.get("/documents", async (req, res) => {
  try {
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sb = adminClient();
    const { data, error } = await sb
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return res.status(500).json({ error: "Failed to fetch documents" });
    }

    res.json({ documents: data || [] });
  } catch (err) {
    console.error("Error in /documents route:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// GET /api/documents/:id/summary - Get or generate document summary
router.get("/documents/:id/summary", async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const forceRegenerate = req.query.regenerate === "true";

    const summary = await getSummary(id, userId, forceRegenerate);

    res.json({ success: true, summary });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to generate summary";
    console.error("Error generating summary:", err);
    res.status(500).json({
      error: "Failed to generate summary",
      message: errorMessage
    });
  }
});

// DELETE /api/documents/:id - Delete a document and its chunks
router.delete("/documents/:id", async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const sb = adminClient();

    // Delete chunks first (foreign key constraint)
    const { error: chunksError } = await sb
      .from("document_chunks")
      .delete()
      .eq("document_id", id);

    if (chunksError) {
      console.error("Error deleting chunks:", chunksError);
      return res.status(500).json({ error: "Failed to delete document chunks" });
    }

    // Delete document (with user ownership check)
    const { error: docError } = await sb
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (docError) {
      console.error("Error deleting document:", docError);
      return res.status(500).json({ error: "Failed to delete document" });
    }

    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;