import { Router } from "express";
import multer from "multer";
import type { Request } from "express";
import { EmbeddingService } from "../../core/services/embedding.service";
import { requireAuth } from "../middleware/auth.middleware";
import { ChunkingService } from "../../core/services/chunking.service";
import { FileParserService } from "../../core/services/fileParser.service";
import { adminClient } from "../../core/clients/supabaseClient";
import { validateUUID } from "../middleware/validation";
import { BadRequestError, UnauthorizedError, ConflictError, InternalServerError, TooManyRequestsError } from "../../shared/errors";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import { logger } from "../../shared/utils/logger";
import { checkUploadLimit, getRemainingUploads } from "../../core/services/uploadLimit.service";
import { validateDocumentIsTechnical } from "../../core/services/validation.service";
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

/** Extract text from file without chunking */
async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(
    tempDir,
    `extract-${Date.now()}-${file.originalname}`
  );

  try {
    await fs.writeFile(tempFilePath, file.buffer);

    // Parse the file to extract text
    const text = await FileParserService.parseFile(
      tempFilePath,
      file.mimetype
    );

    // Clean up temp file
    await fs.unlink(tempFilePath);

    if (!text || text.trim().length === 0) {
      throw new Error("No text content found in file");
    }

    // Remove null bytes that cause PostgreSQL errors
    const cleanText = text.replace(/\0/g, "");

    logger.info(
      `📄 Extracted ${cleanText.length} characters from ${file.originalname}`
    );

    return cleanText;
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempFilePath);
    } catch {}
    throw error;
  }
}

/** Chunk text content */
async function chunkTextContent(text: string): Promise<Chunk[]> {
  const chunker = new ChunkingService();
  const textChunks = await chunker.chunkText(text);

  // Convert to our Chunk format
  const chunks: Chunk[] = textChunks.map((chunk) => ({
    index: chunk.chunkIndex,
    text: chunk.content,
    metadata: { tokenCount: chunk.tokenCount },
  }));

  return chunks;
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

      const sb = adminClient();

      // Check upload limit before processing file
      const uploadLimitStatus = await checkUploadLimit(sb, userId);
      if (!uploadLimitStatus.allowed) {
        const resetDateFormatted = uploadLimitStatus.resetDate.toISOString().split('T')[0];
        logger.warn(`Upload limit exceeded for user ${userId}`, {
          count: uploadLimitStatus.count,
          limit: uploadLimitStatus.limit,
          resetDate: resetDateFormatted,
        });

        throw new TooManyRequestsError(
          `Weekly upload limit reached. You have uploaded ${uploadLimitStatus.count}/${uploadLimitStatus.limit} documents this week. Limit resets on ${resetDateFormatted}.`
        );
      }

      const { originalname, mimetype, size, buffer } = req.file;

      // Additional validation
      if (size === 0) {
        throw new BadRequestError("File is empty. Please upload a file with content.");
      }

      logger.info(
        `\n--- Upload received: ${originalname} (${size} bytes, ${mimetype}) ---`
      );

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

      // Extract text content first
      logger.info(`Extracting text from: ${originalname}`);
      const documentText = await extractTextFromFile(req.file);

      // Validate document is technical BEFORE heavy processing
      logger.info(`Validating document type for: ${originalname}`);
      const validationResult = await validateDocumentIsTechnical(documentText, originalname);

      logger.info('Document type validation result:', {
        fileName: originalname,
        isTechnical: validationResult.isTechnical,
        confidence: validationResult.confidence,
        reason: validationResult.reason,
      });

      // Reject non-technical documents (with high confidence)
      if (!validationResult.isTechnical && validationResult.confidence > 0.7) {
        logger.warn(`Non-technical document rejected: ${originalname}`, {
          reason: validationResult.reason,
          confidence: validationResult.confidence,
        });

        throw new BadRequestError(
          `This document doesn't appear to be technical documentation. ${validationResult.reason}. ` +
          `This system is designed for technical documents related to software development, DevOps, and system architecture.`
        );
      }

      // Only do heavy work if document is technical and not a duplicate
      console.time("chunking");
      const chunks: Chunk[] = await chunkTextContent(documentText);
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

// GET /upload/status - Get upload limit status for current user
router.get("/upload/status", async (req: Request, res, next) => {
  try {
    const userId: string | null = req.authUserId ?? null;
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const sb = adminClient();
    const status = await getRemainingUploads(sb, userId);

    return res.json({
      success: true,
      uploads: {
        remaining: status.remaining,
        total: status.total,
        used: status.used,
        resetDate: status.resetDate.toISOString(),
      },
    });
  } catch (err: any) {
    next(err);
  }
});

export default router;
