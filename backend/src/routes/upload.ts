import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { supabase } from '../services/supabase';
import { FileParser } from '../services/fileParser';
import { UploadResponse } from '../types';

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, and CSV files are allowed.'));
    }
  },
});

/**
 * POST /api/upload
 * Upload a document, parse it, and store in Supabase
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      } as UploadResponse);
    }

    const file = req.file;
    console.log('📄 Processing file:', file.originalname);

    // Step 1: Parse the file content
    console.log('🔍 Parsing file content...');
    const textContent = await FileParser.parseFile(file.path, file.mimetype);

    if (!textContent || textContent.trim().length === 0) {
      await fs.unlink(file.path); // Clean up
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from file',
      } as UploadResponse);
    }

    console.log(`✅ Extracted ${textContent.length} characters`);

    // Step 2: Upload file to Supabase Storage
    console.log('☁️ Uploading to Supabase Storage...');
    const fileBuffer = await fs.readFile(file.path);
    const storagePath = `documents/${Date.now()}-${file.originalname}`;

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      await fs.unlink(file.path); // Clean up
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to storage',
        error: storageError.message,
      } as UploadResponse);
    }

    console.log('✅ File uploaded to storage');

    // Step 3: Save document metadata to database
    console.log('💾 Saving to database...');

    // Extract title from filename (remove extension)
    const title = file.originalname.replace(/\.[^/.]+$/, '');

    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        title: title,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        content: textContent,
        file_url: storagePath,
        metadata: {},
      })
      .select()
      .single();

    if (dbError || !document) {
      console.error('Database error:', dbError);
      // Try to clean up storage
      await supabase.storage.from('documents').remove([storagePath]);
      await fs.unlink(file.path);
      return res.status(500).json({
        success: false,
        message: 'Failed to save document to database',
        error: dbError?.message,
      } as UploadResponse);
    }

    console.log('✅ Document saved to database');

    // Step 4: Clean up local file
    await fs.unlink(file.path);
    console.log('🧹 Cleaned up temporary file');

    // Step 5: Return success response
    return res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        filename: document.file_name,
        file_size: FileParser.formatFileSize(document.file_size),
        file_type: document.file_type,
      },
    } as UploadResponse);

  } catch (error) {
    console.error('❌ Upload error:', error);

    // Clean up file if it exists
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as UploadResponse);
  }
});

/**
 * GET /api/documents
 * Get all uploaded documents
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, title, file_name, file_type, file_size, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents',
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      documents: documents?.map(doc => ({
        ...doc,
        file_size: FileParser.formatFileSize(doc.file_size),
      })),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get document to find file_url
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_url]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from database (this will cascade delete chunks)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;