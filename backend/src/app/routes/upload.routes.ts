import { Router } from "express";
import multer from "multer";
import type { Request } from "express";
import { EmbeddingService } from "../../core/services/embedding.service";
import { requireAuth } from "../middleware/auth.middleware";
import { ChunkingService } from "../../core/services/chunking.service";
import { FileParserService } from "../../core/services/fileParser.service";
import { adminClient } from "../../core/clients/supabaseClient";
import { validateUUID } from "../middleware/validation";
import { BadRequestError, UnauthorizedError, ConflictError, InternalServerError } from "../../shared/errors";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import { logger } from "../../shared/utils/logger";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const router = Router();
router.use(requireAuth);

// File upload limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const uploadRoutes = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOCX, and TXT files are allowed."
        )
      );
    }
  },
});

/** Shape we'll use throughout this file for chunks */
type Chunk = {
  index: number;
  text: string;
  metadata?: Record<string, any>;
};

/** Batch embeddings to avoid a single huge request */
async function embedInBatches(
  texts: string[],
  batchSize: number = 64
): Promise<number[][]> {
  const out: number[][] = [];
  const totalBatches = Math.ceil(texts.length / batchSize);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const slice: string[] = texts.slice(i, i + batchSize);

    logger.info(
      `🔄 Processing batch ${batchNum}/${totalBatches} (${slice.length} chunks)...`
    );

    try {
      const vecs: number[][] = await EmbeddingService.generateEmbeddings(slice);
      out.push(...vecs);
      logger.info(`✅ Batch ${batchNum}/${totalBatches} complete`);
    } catch (error) {
      logger.error(`❌ Batch ${batchNum} failed:`, { error });
      throw error;
    }
  }

  return out;
}

/** Parse file and chunk the text */
async function normalizeChunksFromFile(
  file: Express.Multer.File
): Promise<Chunk[]> {
  // Step 1: Save buffer to temp file (FileParserService needs a file path)
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(
    tempDir,
    `upload-${Date.now()}-${file.originalname}`
  );

  try {
    await fs.writeFile(tempFilePath, file.buffer);

    // Step 2: Parse the file to extract text
    const text = await FileParserService.parseFile(
      tempFilePath,
      file.mimetype
    );

    if (!text || text.trim().length === 0) {
      throw new Error("No text content found in file");
    }

    // Remove null bytes that cause PostgreSQL errors
    const cleanText = text.replace(/\0/g, "");

    logger.info(
      `📄 Extracted ${cleanText.length} characters from ${file.originalname}`
    );

    // Step 3: Chunk the text
    const chunker = new ChunkingService();
    const textChunks = await chunker.chunkText(cleanText);

    // Step 4: Convert to our Chunk format
    const chunks: Chunk[] = textChunks.map((chunk) => ({
      index: chunk.chunkIndex,
      text: chunk.content,
      metadata: { tokenCount: chunk.tokenCount },
    }));

    return chunks;
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFilePath);
    } catch (err) {
      logger.error("Failed to delete temp file:", { error: err });
    }
  }
}

router.post(
  "/upload",
  rateLimitMiddleware.upload,
  (req, res, next) => {
    uploadRoutes.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new BadRequestError("File too large. Maximum size is 10MB."));
        }
        return next(new BadRequestError(err.message));
      } else if (err) {
        return next(new BadRequestError(err.message));
      }
      next();
    });
  },
  async (req: Request, res, next) => {
    try {
      if (!req.file) {
        throw new BadRequestError("No file uploaded");
      }

      const userId: string | null = req.authUserId ?? null;
      if (!userId) {
        throw new UnauthorizedError("User not authenticated");
      }

      const { originalname, mimetype, size, buffer } = req.file;

      // Additional validation
      if (size === 0) {
        throw new BadRequestError("File is empty. Please upload a file with content.");
      }

      logger.info(
        `\n--- Upload received: ${originalname} (${size} bytes, ${mimetype}) ---`
      );

      const sb = adminClient();

      // ✅ Compute hash of file contents
      const fileHash = crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

      // ✅ Check if this user already has this exact file
      const { data: existingDocs, error: existingErr } = await sb
        .from("documents")
        .select("id, file_name, created_at")
        .eq("user_id", userId)
        .eq("file_hash", fileHash)
        .limit(1);

      if (existingErr) {
        logger.error("Error checking duplicate document:", { error: existingErr });
        throw new InternalServerError("Failed to check existing documents.");
      }

      const existingDoc = existingDocs?.[0];
      if (existingDoc) {
        logger.info(
          `Duplicate upload detected for user ${userId}, hash ${fileHash}, existing doc id ${existingDoc.id}`
        );
        throw new ConflictError(`This document already exists in your library as "${existingDoc.file_name}".`);
      }

      // Only do heavy work if not a duplicate
      console.time("chunking");
      const chunks: Chunk[] = await normalizeChunksFromFile(req.file);
      console.timeEnd("chunking");

      if (!chunks.length) {
        throw new BadRequestError("No text content found to chunk");
      }
      logger.info(`Created ${chunks.length} chunk(s)`);

      // Log chunk size for debugging
      const avgChunkSize =
        chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length;
      logger.info(
        `📊 Average chunk size: ${Math.round(avgChunkSize)} characters`
      );

      // Insert document with hash
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
          file_hash: fileHash,
        })
        .select("id")
        .single();

      if (docErr || !docIns) {
        logger.error("Supabase insert document error:", { error: docErr });
        throw new InternalServerError("Failed to create document record");
      }

      const documentId: string = docIns.id;

      console.time("embeddings");
      const texts: string[] = chunks.map((c: Chunk) => c.text);
      const BATCH_SIZE = 64;

      logger.info(
        `⏳ Generating embeddings for ${texts.length} chunks in batches of ${BATCH_SIZE}...`
      );

      const vectors: number[][] =
        texts.length > BATCH_SIZE
          ? await embedInBatches(texts, BATCH_SIZE)
          : await EmbeddingService.generateEmbeddings(texts);
      console.timeEnd("embeddings");

      logger.info(`✅ Generated ${vectors.length} embeddings`);

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
        const { error: chunkErr } = await sb
          .from("document_chunks")
          .insert(slice);
        if (chunkErr) {
          logger.error("Supabase insert chunks error:", { error: chunkErr });
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
      next(err);
    }
  }
);

export default router;
