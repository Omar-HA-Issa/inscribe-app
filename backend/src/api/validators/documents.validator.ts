import { z } from 'zod';

/**
 * Zod schemas for document-related request validation
 */

export const getDocumentsSchema = z.object({
  query: z.object({
    limit: z.string().optional().default('50').pipe(z.coerce.number().max(100)),
    offset: z.string().optional().default('0').pipe(z.coerce.number().min(0)),
  }),
});

export const getDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID format'),
  }),
});

export const deleteDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID format'),
  }),
});

export const documentCountSchema = z.object({});

export type GetDocumentsRequest = z.infer<typeof getDocumentsSchema>;
export type GetDocumentRequest = z.infer<typeof getDocumentSchema>;
export type DeleteDocumentRequest = z.infer<typeof deleteDocumentSchema>;
