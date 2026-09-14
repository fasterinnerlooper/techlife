import { z } from 'zod';

export const CreateImportSchema = z.object({
  method: z.enum(['PASTE_TEXT', 'UPLOAD_IMAGE', 'PASTE_URL', 'FREEFORM_DESCRIPTION', 'PHOTO_COLLECTION']),
  sourceLabel: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  content: z.string().min(1).max(30000),
});

export const ConfirmCandidatesSchema = z.object({
  confirmations: z.array(
    z.object({
      candidateId: z.string().uuid(),
      overrideName: z.string().optional(),
      overrideModel: z.string().optional(),
      markDuplicateOfOwnershipId: z.string().uuid().optional(),
      makePublic: z.boolean().optional(),
    }),
  ),
});
