import pdf from 'pdf-parse';
import { PDFExtract } from 'pdf.js-extract';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import { logger } from '../../shared/utils/logger';

export class FileParserService {
  /**
   * Parse different file types and extract text content
   */
  static async parseFile(filePath: string, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.parsePDF(filePath);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.parseDOCX(filePath);

        case 'text/plain':
        case 'text/csv':
          return await this.parseTXT(filePath);

        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      logger.error('Error parsing file:', { error });

      if (error instanceof Error) {
        if (error.message.includes('corrupted') ||
            error.message.includes('encrypted') ||
            error.message.includes('Unsupported') ||
            error.message.includes('Unable to extract')) {
          throw error;
        }
      }

      throw new Error(`Failed to parse file: ${error}`);
    }
  }

  /**
   * Parse PDF files with fallback handling
   */
  private static async parsePDF(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);

    // Strategy 1: Try pdf-parse first (faster)
    try {
      const data = await pdf(dataBuffer);

      // Check page count limit
      if (data.numpages > 50) {
        throw new Error(
          `PDF has too many pages (${data.numpages}). Maximum is 50 pages. ` +
          'Please split your document or upload key sections only.'
        );
      }

      if (data.text && data.text.trim().length > 50) {
        logger.info(`✅ PDF parsed with pdf-parse: ${data.text.length} characters, ${data.numpages} pages`);
        return data.text;
      } else {
        logger.warn('⚠️ pdf-parse extracted very little text, trying alternative...');
      }
    } catch (firstError) {
      const errorMsg = firstError instanceof Error ? firstError.message : String(firstError);

      // Re-throw page count errors
      if (errorMsg.includes('too many pages')) {
        throw firstError;
      }

      logger.warn('pdf-parse failed:', { error: errorMsg });
    }

    // Strategy 2: Try pdf.js-extract (better for complex PDFs)
    try {
      const pdfExtract = new PDFExtract();
      const data = await pdfExtract.extractBuffer(dataBuffer);

      // Check page count limit
      if (data.pages.length > 50) {
        throw new Error(
          `PDF has too many pages (${data.pages.length}). Maximum is 50 pages. ` +
          'Please split your document or upload key sections only.'
        );
      }

      let text = '';
      for (const page of data.pages) {
        for (const item of page.content) {
          if (item.str) {
            text += item.str + ' ';
          }
        }
        text += '\n\n'; // Add page break
      }

      if (text.trim().length > 50) {
        logger.info(`✅ PDF parsed with pdf.js-extract: ${text.length} characters, ${data.pages.length} pages`);
        return text;
      } else {
        logger.warn('⚠️ pdf.js-extract extracted very little text');
      }
    } catch (secondError) {
      const errorMsg = secondError instanceof Error ? secondError.message : String(secondError);

      // Re-throw page count errors
      if (errorMsg.includes('too many pages')) {
        throw secondError;
      }

      logger.error('pdf.js-extract failed:', { error: errorMsg });
    }

    // All strategies failed
    throw new Error(
      'Unable to extract text from this PDF. The PDF may be:\n' +
      '1. Scanned images (requires OCR)\n' +
      '2. Encrypted or password-protected\n' +
      '3. Corrupted or in an unsupported format\n' +
      'Try converting it to a text-based PDF or use a .txt/.docx file instead.'
    );
  }

  /**
   * Parse DOCX files
   */
  private static async parseDOCX(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });

      if (!result.value || result.value.trim().length === 0) {
        throw new Error(
          'Document appears to be empty. Please ensure the file contains text content.'
        );
      }

      return result.value;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes('empty')) {
        throw error;
      }

      throw new Error(
        `Failed to parse Word document: ${errorMsg}. ` +
        'The file may be corrupted or in an unsupported format.'
      );
    }
  }

  /**
   * Parse plain text files
   */
  private static async parseTXT(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      if (!content || content.trim().length === 0) {
        throw new Error('Text file is empty. Please upload a file with content.');
      }

      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes('empty')) {
        throw error;
      }

      throw new Error(`Failed to read text file: ${errorMsg}`);
    }
  }

  /**
   * Get file size in a human-readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}