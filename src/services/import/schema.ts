import { z } from 'zod';

export const CreateImportSchema = z
  .object({
    method: z.enum(['PASTE_TEXT', 'UPLOAD_IMAGE', 'PASTE_URL', 'FREEFORM_DESCRIPTION', 'PHOTO_COLLECTION']),
    sourceLabel: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    content: z.string().max(30000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === 'PASTE_URL') {
      if (!value.sourceUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sourceUrl'],
          message: 'sourceUrl is required when method is PASTE_URL',
        });
      }
      return;
    }

    if (!value.content || value.content.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content'],
        message: 'content is required for this import method',
      });
    }
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
