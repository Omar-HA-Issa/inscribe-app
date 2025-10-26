import { Router, Request, Response } from 'express';
import multer from 'multer';
import { FileParser } from '../services/fileParser';
import { ChunkingService } from '../services/chunkingService';
import { EmbeddingService } from '../services/embeddingService';
import { supabase } from '../config/supabase';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Initialize services
    const chunkingService = new ChunkingService();
    const embeddingService = new EmbeddingService(process.env.OPENAI_API_KEY!);

    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `documents/${fileName}`;

    console.log(`Processing file: ${file.originalname}`);

    // Step 1: Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // Step 2: Parse document content
    console.log('Parsing document content...');
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
    await writeFile(tempFilePath, file.buffer);

    let parsedText: string;
    try {
      parsedText = await FileParser.parseFile(tempFilePath, file.mimetype);
      await unlink(tempFilePath);
    } catch (error) {
      await unlink(tempFilePath);
      console.error('Document parsing error:', error);
      throw new Error('Failed to parse document');
    }

    // Step 3: Save document metadata to database
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        title: file.originalname,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_url: filePath,
        content: parsedText,
      })
      .select()
      .single();

    if (documentError) {
      console.error('Database insert error:', documentError);
      return res.status(500).json({ error: 'Failed to save document metadata' });
    }

    console.log(`Document saved with ID: ${documentData.id}`);

    // Step 4: Chunk the document
    console.log('Chunking document...');
    const chunks = await chunkingService.chunkText(parsedText);
    console.log(`Created ${chunks.length} chunks`);

    // Step 5: Generate embeddings for all chunks
    console.log('Generating embeddings...');
    const chunkTexts = chunks.map(c => c.content);

    let embeddings;
    try {
      embeddings = await embeddingService.generateEmbeddings(chunkTexts);
      console.log(`Generated ${embeddings.length} embeddings`);
    } catch (embeddingError) {
      console.error('Embedding generation error:', embeddingError);
      throw new Error('Failed to generate embeddings');
    }

    // Step 6: Save chunks with embeddings to database
    console.log('Saving chunks to database...');
    const chunksToInsert = chunks.map((chunk, index) => ({
      document_id: documentData.id,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
      embedding: embeddings[index],
      metadata: {
        token_count: chunk.tokenCount,
      },
    }));

    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunksToInsert);

    if (chunksError) {
      console.error('Chunks insert error:', chunksError);
      return res.status(500).json({ error: 'Failed to save document chunks' });
    }

    console.log('Document processing complete');

    res.json({
      success: true,
      message: 'Document uploaded and processed successfully',
      document: {
        id: documentData.id,
        filename: documentData.file_name,
        chunksCreated: chunks.length,
      },
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;