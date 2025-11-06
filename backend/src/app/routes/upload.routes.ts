import { Router } from "express";
import multer from "multer";
import type { Request } from "express";
import { EmbeddingService } from "../../core/services/embedding.service";
import { requireAuth  } from "../middleware/auth.middleware";
import { ChunkingService } from "../../core/services/chunking.service";
import { FileParserService } from "../../core/services/fileParser.service";
import { adminClient } from "../../core/clients/supabaseClient";
import fs from "fs/promises";
import path from "path";
import os from "os";

const router = Router();
router.use(requireAuth);

const uploadRoutes = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/** Shape we'll use throughout this file for chunks */
type Chunk = {
  index: number;
  text: string;
  metadata?: Record<string, any>;
};

/** Batch embeddings to avoid a single huge request */
async function embedInBatches(texts: string[], batchSize: number = 64): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice: string[] = texts.slice(i, i + batchSize);
    const vecs: number[][] = await EmbeddingService.generateEmbeddings(slice);
    out.push(...vecs);
  }
  return out;
}

/** Parse file and chunk the text */
async function normalizeChunksFromFile(file: Express.Multer.File): Promise<Chunk[]> {
  // ✅ Step 1: Save buffer to temp file (FileParserService needs a file path)
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${file.originalname}`);

  try {
    await fs.writeFile(tempFilePath, file.buffer);

    // ✅ Step 2: Parse the file to extract text
    const text = await FileParserService.parseFile(tempFilePath, file.mimetype);

    if (!text || text.trim().length === 0) {
      throw new Error("No text content found in file");
    }

    console.log(`📄 Extracted ${text.length} characters from ${file.originalname}`);

    // ✅ Step 3: Chunk the text
    const chunker = new ChunkingService();
    const textChunks = await chunker.chunkText(text);

    // ✅ Step 4: Convert to our Chunk format
    const chunks: Chunk[] = textChunks.map((chunk) => ({
      index: chunk.chunkIndex,
      text: chunk.content,
      metadata: { tokenCount: chunk.tokenCount },
    }));

    return chunks;
  } finally {
    // ✅ Clean up temp file
    try {
      await fs.unlink(tempFilePath);
    } catch (err) {
      console.error('Failed to delete temp file:', err);
    }
  }
}

router.post(
  "/upload",
  uploadRoutes.single("file"),
  async (req: Request, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const userId: string | null = req.authUserId ?? null;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { originalname, mimetype, size } = req.file;
      console.log(`\n--- Upload received: ${originalname} (${size} bytes, ${mimetype}) ---`);

      console.time("chunking");
      const chunks: Chunk[] = await normalizeChunksFromFile(req.file);
      console.timeEnd("chunking");

      if (!chunks.length) {
        return res.status(400).json({ success: false, message: "No text content found to chunk" });
      }
      console.log(`✅ Created ${chunks.length} chunk(s)`);

      const sb = adminClient();
      const { data: docIns, error: docErr } = await sb
        .from("documents")
        .insert({
          user_id: userId,
          title: originalname,
          file_name: originalname,
          file_type: mimetype,
          file_size: size,
          content: null,
          file_url: null,
          metadata: {},
        })
        .select("id")
        .single();

      if (docErr || !docIns) {
        console.error("Supabase insert document error:", docErr);
        return res.status(500).json({ success: false, message: "Failed to create document record" });
      }
      const documentId: string = docIns.id;

      console.time("embeddings");
      const texts: string[] = chunks.map((c: Chunk) => c.text);
      const BATCH_SIZE = 64;

      const vectors: number[][] =
        texts.length > BATCH_SIZE
          ? await embedInBatches(texts, BATCH_SIZE)
          : await EmbeddingService.generateEmbeddings(texts);
      console.timeEnd("embeddings");

      if (!vectors.length || vectors.length !== texts.length) {
        throw new Error("Failed to generate embeddings for all chunks");
      }

      console.time("persist");
      type ChunkRow = {
        document_id: string;
        content: string;
        chunk_index: number;
        embedding: number[];
        metadata: Record<string, any> | null;
      };

      const rows: ChunkRow[] = chunks.map((c: Chunk, i: number): ChunkRow => ({
        document_id: documentId,
        content: c.text,
        chunk_index: c.index ?? i,
        embedding: vectors[i],
        metadata: c.metadata ?? null,
      }));

      const INSERT_BATCH = 100;
      for (let i = 0; i < rows.length; i += INSERT_BATCH) {
        const slice: ChunkRow[] = rows.slice(i, i + INSERT_BATCH);
        const { error: chunkErr } = await sb.from("document_chunks").insert(slice);
        if (chunkErr) {
          console.error("Supabase insert chunks error:", chunkErr);
          throw new Error("Failed to save chunks");
        }
      }
      console.timeEnd("persist");

      return res.json({
        success: true,
        message: "Upload processed",
        document: {
          id: documentId,
          file_name: originalname,
          file_type: mimetype,
          file_size: size,
          chunkCount: chunks.length,
        },
      });
    } catch (err: any) {
      console.error("Error processing uploadRoutes:", err?.message || err);
      console.error("Error stack:", err?.stack || err);
      const msg = err?.message || "Upload failed. Please try again.";
      return res.status(500).json({ success: false, message: msg });
    }
  }
);

export default router;