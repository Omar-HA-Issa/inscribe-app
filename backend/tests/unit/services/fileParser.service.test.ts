import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileParserService } from '../../../src/core/services/fileParser.service';

// Mock dependencies
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

vi.mock('pdf.js-extract', () => ({
  PDFExtract: vi.fn().mockImplementation(() => ({
    extractBuffer: vi.fn(),
  })),
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock('../../../src/shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import pdf from 'pdf-parse';
import { PDFExtract } from 'pdf.js-extract';
import mammoth from 'mammoth';
import fs from 'fs/promises';

describe('FileParserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseFile', () => {
    describe('PDF parsing', () => {
      it('should parse PDF successfully with pdf-parse', async () => {
        const mockText = 'This is the extracted PDF text content for testing.';
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake pdf'));
        vi.mocked(pdf).mockResolvedValue({
          text: mockText,
          numpages: 5,
          info: {},
          metadata: null,
          version: '1.0',
        });

        const result = await FileParserService.parseFile('/path/to/file.pdf', 'application/pdf');

        expect(result).toBe(mockText);
        expect(pdf).toHaveBeenCalled();
      });

      it('should throw error for PDF with too many pages', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake pdf'));
        vi.mocked(pdf).mockResolvedValue({
          text: 'Some text',
          numpages: 51, // Over 50 page limit
          info: {},
          metadata: null,
          version: '1.0',
        });

        await expect(FileParserService.parseFile('/path/to/file.pdf', 'application/pdf'))
          .rejects.toThrow('too many pages');
      });

      it('should throw error when pdf-parse fails and fallback also fails', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake pdf'));
        vi.mocked(pdf).mockRejectedValue(new Error('PDF parse error'));

        // When both parsers fail, it should throw an error
        await expect(FileParserService.parseFile('/path/to/file.pdf', 'application/pdf'))
          .rejects.toThrow('Unable to extract text');
      });

      it('should throw error when both PDF parsers fail', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake pdf'));
        vi.mocked(pdf).mockRejectedValue(new Error('PDF parse error'));

        const mockPdfExtract = {
          extractBuffer: vi.fn().mockResolvedValue({
            pages: [{ content: [] }], // No text content
          }),
        };
        vi.mocked(PDFExtract).mockImplementation(() => mockPdfExtract as any);

        await expect(FileParserService.parseFile('/path/to/file.pdf', 'application/pdf'))
          .rejects.toThrow('Unable to extract text');
      });

      it('should throw error when pdf-parse extracts very little text and fallback fails', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake pdf'));
        vi.mocked(pdf).mockResolvedValue({
          text: 'ab', // Less than 50 characters
          numpages: 1,
          info: {},
          metadata: null,
          version: '1.0',
        });

        // When pdf-parse returns little text and fallback also fails, should throw error
        await expect(FileParserService.parseFile('/path/to/file.pdf', 'application/pdf'))
          .rejects.toThrow('Unable to extract text');
      });
    });

    describe('DOCX parsing', () => {
      it('should parse DOCX successfully', async () => {
        const mockText = 'This is the extracted DOCX text content.';
        vi.mocked(mammoth.extractRawText).mockResolvedValue({
          value: mockText,
          messages: [],
        });

        const result = await FileParserService.parseFile(
          '/path/to/file.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        expect(result).toBe(mockText);
      });

      it('should also handle application/msword mime type', async () => {
        const mockText = 'Old Word format text.';
        vi.mocked(mammoth.extractRawText).mockResolvedValue({
          value: mockText,
          messages: [],
        });

        const result = await FileParserService.parseFile('/path/to/file.doc', 'application/msword');

        expect(result).toBe(mockText);
      });

      it('should throw error for empty DOCX', async () => {
        vi.mocked(mammoth.extractRawText).mockResolvedValue({
          value: '',
          messages: [],
        });

        await expect(FileParserService.parseFile(
          '/path/to/file.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )).rejects.toThrow('empty');
      });

      it('should throw error when DOCX parsing fails', async () => {
        vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error('Corrupted file'));

        await expect(FileParserService.parseFile(
          '/path/to/file.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )).rejects.toThrow('Failed to parse Word document');
      });
    });

    describe('TXT parsing', () => {
      it('should parse TXT successfully', async () => {
        const mockText = 'This is plain text content.';
        vi.mocked(fs.readFile).mockResolvedValue(mockText);

        const result = await FileParserService.parseFile('/path/to/file.txt', 'text/plain');

        expect(result).toBe(mockText);
      });

      it('should also handle text/csv mime type', async () => {
        const mockText = 'col1,col2,col3\nval1,val2,val3';
        vi.mocked(fs.readFile).mockResolvedValue(mockText);

        const result = await FileParserService.parseFile('/path/to/file.csv', 'text/csv');

        expect(result).toBe(mockText);
      });

      it('should throw error for empty TXT file', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('');

        await expect(FileParserService.parseFile('/path/to/file.txt', 'text/plain'))
          .rejects.toThrow('empty');
      });

      it('should throw error for whitespace-only TXT file', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('   \n\n   ');

        await expect(FileParserService.parseFile('/path/to/file.txt', 'text/plain'))
          .rejects.toThrow('empty');
      });

      it('should throw error when reading file fails', async () => {
        vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

        await expect(FileParserService.parseFile('/path/to/file.txt', 'text/plain'))
          .rejects.toThrow('Failed to read text file');
      });
    });

    describe('Unsupported file types', () => {
      it('should throw error for unsupported mime type', async () => {
        await expect(FileParserService.parseFile('/path/to/file.jpg', 'image/jpeg'))
          .rejects.toThrow('Unsupported file type: image/jpeg');
      });

      it('should throw error for unknown mime type', async () => {
        await expect(FileParserService.parseFile('/path/to/file.xyz', 'application/xyz'))
          .rejects.toThrow('Unsupported file type');
      });
    });
  });

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(FileParserService.formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(FileParserService.formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(FileParserService.formatFileSize(1024)).toBe('1 KB');
      expect(FileParserService.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(FileParserService.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(FileParserService.formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(FileParserService.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should round to 2 decimal places', () => {
      expect(FileParserService.formatFileSize(1234567)).toBe('1.18 MB');
    });
  });
});
