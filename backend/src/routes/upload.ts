import { Router } from "express";
import multer from "multer";
import type { Request } from "express";
import supabase from "../lib/supabase";
import { EmbeddingService } from "../services/embeddingService";
// import { authRequired } from "../middleware/auth";
import { ChunkingService } from "../services/chunkingService";

const r = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

/** Shape we’ll use throughout this file for chunks */
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
    const vecs: number[][] = await EmbeddingService.generateEmbeddings(slice); // STATIC call
    out.push(...vecs);
  }
  return out;
}

/** Normalize whatever the chunker returns into our {index, text, metadata} shape */
async function normalizeChunksFromFile(file: Express.Multer.File): Promise<Chunk[]> {
  // Prefer binary-aware chunking (PDF/DOCX) if your service exposes it
  const anyChunker = ChunkingService as any;

  if (typeof anyChunker?.chunkDocument === "function") {
    const raw = await anyChunker.chunkDocument({
      buffer: file.buffer,
      filename: file.originalname,
      // You can pass tuning knobs if your service supports them:
      // chunkSize: 1200, chunkOverlap: 150
    });

    const chunks: Chunk[] = (raw || []).map((c: any, i: number) => ({
      index: typeof c.index === "number" ? c.index : i,
      text: typeof c.text === "string" ? c.text : (typeof c.content === "string" ? c.content : String(c ?? "")),
      metadata: typeof c.metadata === "object" && c.metadata ? c.metadata : undefined,
    }));

    return chunks;
  }

  // Fallback: treat file as UTF-8 text
  const text = file.buffer.toString("utf8");
  const raw = await anyChunker?.chunk?.(text);
  const chunks: Chunk[] = (raw || []).map((c: any, i: number) => ({
    index: typeof c.index === "number" ? c.index : i,
    text: typeof c.text === "string" ? c.text : (typeof c.content === "string" ? c.content : String(c ?? "")),
    metadata: typeof c.metadata === "object" && c.metadata ? c.metadata : undefined,
  }));
  return chunks;
}

r.post(
  "/upload",
  // authRequired,
  upload.single("file"),
  async (req: Request, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      // You said auth is all backend-side:
      const userId: string | null = (req as any).user?.id ?? null;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { originalname, mimetype, size } = req.file;
      console.log(`\n--- Upload received: ${originalname} (${size} bytes, ${mimetype}) ---`);

      // 1) Chunking
      console.time("chunking");
      const chunks: Chunk[] = await normalizeChunksFromFile(req.file);
      console.timeEnd("chunking");

      if (!chunks.length) {
        return res.status(400).json({ success: false, message: "No text content found to chunk" });
      }
      console.log(`Created ${chunks.length} chunk(s)`);

      // 2) Insert document row to get document_id (map to your schema)
      const sb = supabase();
      const { data: docIns, error: docErr } = await sb
        .from("documents")
        .insert({
          user_id: userId,
          title: originalname,        // you can later let user rename
          file_name: originalname,
          file_type: mimetype,
          file_size: size,
          content: null,              // keeping null so we rely on chunks
          file_url: null,             // set if you also upload raw file to storage
          metadata: {},               // optional: add any derived metadata
        })
        .select("id")
        .single();

      if (docErr || !docIns) {
        console.error("Supabase insert document error:", docErr);
        return res.status(500).json({ success: false, message: "Failed to create document record" });
      }
      const documentId: string = docIns.id;

      // 3) Embeddings (batched)
      console.time("embeddings");
      const texts: string[] = chunks.map((c: Chunk) => c.text);
      const BATCH_SIZE = 64;

      const vectors: number[][] =
        texts.length > BATCH_SIZE
          ? await embedInBatches(texts, BATCH_SIZE)
          : await EmbeddingService.generateEmbeddings(texts); // STATIC call
      console.timeEnd("embeddings");

      if (!vectors.length || vectors.length !== texts.length) {
        throw new Error("Failed to generate embeddings for all chunks");
      }

      // 4) Persist chunks in batches (map to your schema)
      console.time("persist");
      type ChunkRow = {
        document_id: string;
        content: string;
        chunk_index: number;
        embedding: number[]; // pgvector accepts number[]; Supabase coerces to vector(1536)
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
      console.error("Error processing upload:", err?.message || err);
      console.error("Error stack:", err?.stack || err);
      const msg =
        typeof err?.message === "string" &&
        (err.message.includes("generateEmbeddings is not a function") ||
          err.message.includes("Failed to generate embeddings"))
          ? "Failed to generate embeddings (check EmbeddingService export, OpenAI key, and model)."
          : "Upload failed. Please try again.";
      return res.status(500).json({ success: false, message: msg });
    }
  }
);

export default r;
