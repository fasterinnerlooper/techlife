import { z } from 'zod';

export const ExtractedOwnershipSchema = z.object({
  extractedName: z.string().min(1),
  manufacturer: z.string().optional(),
  categoryKey: z.string().optional(),
  startDateText: z.string().optional(),
  endDateText: z.string().optional(),
  ownershipStatus: z
    .enum(['STILL_OWNED', 'SOLD', 'GIVEN_AWAY', 'LOST', 'STOLEN', 'BROKEN', 'RECYCLED', 'UNKNOWN'])
    .default('UNKNOWN'),
  confidenceScore: z.number().min(0).max(1),
  evidenceSnippets: z.array(z.string().min(1)).default([]),
  ambiguousModels: z.array(z.string().min(1)).default([]),
  provenanceLabel: z.string().optional(),
  reasoning: z.string().optional(),
});

export const ExtractionResultSchema = z.object({
  items: z.array(ExtractedOwnershipSchema),
});

export type ExtractedOwnership = z.infer<typeof ExtractedOwnershipSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export type ExtractionInput = {
  mode: 'text' | 'image' | 'url';
  content: string;
  sourceLabel?: string;
};

export interface IAiProvider {
  name: string;
  extractOwnership(input: ExtractionInput): Promise<ExtractionResult>;
}
