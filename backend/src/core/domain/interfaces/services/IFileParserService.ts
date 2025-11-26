/**
 * Service interface for parsing files and extracting text
 */
export interface IFileParserService {
  /**
   * Parse a file and extract text content
   */
  parse(buffer: Buffer, mimeType: string, fileName: string): Promise<string>;

  /**
   * Check if the service can handle the given file type
   */
  canHandle(mimeType: string): boolean;

  /**
   * Get supported MIME types
   */
  getSupportedTypes(): string[];
}
