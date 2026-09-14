import { Router } from 'express';
import { ImportMethod } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { ConfirmCandidatesSchema, CreateImportSchema } from '../services/import/schema.js';
import { confirmImportCandidates, createImportAndCandidates, getImportReview } from '../services/import/importService.js';
import { upload } from '../middleware/upload.js';

export const importsRouter = Router();
importsRouter.use(requireAuth);

importsRouter.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = CreateImportSchema.parse(req.body);
    const result = await createImportAndCandidates({
      userId: req.userId,
      method: body.method as ImportMethod,
      sourceLabel: body.sourceLabel,
      sourceUrl: body.sourceUrl,
      content: body.content,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

importsRouter.post('/upload', upload.single('image'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });
    const sourceLabel = req.body.sourceLabel || req.file.originalname;
    const content = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const result = await createImportAndCandidates({
      userId: req.userId,
      method: ImportMethod.UPLOAD_IMAGE,
      sourceLabel,
      content,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

importsRouter.get('/:importId/review', async (req: AuthenticatedRequest, res, next) => {
  try {
    const review = await getImportReview(req.userId, req.params.importId);
    if (!review) return res.status(404).json({ error: 'Import not found' });
    return res.json(review);
  } catch (error) {
    return next(error);
  }
});

importsRouter.post('/:importId/confirm', async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = ConfirmCandidatesSchema.parse(req.body);
    const result = await confirmImportCandidates(req.userId, req.params.importId, body.confirmations);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});
