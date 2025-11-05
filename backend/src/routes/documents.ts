import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { adminClient } from "../lib/supabase";

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
  } catch (err: any) {
    console.error("Error in /documents route:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
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
  } catch (err: any) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;