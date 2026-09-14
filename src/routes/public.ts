import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { getPublicTimeline } from '../services/timeline/timelineService.js';

export const publicRouter = Router();

const ProfileSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  headline: z.string().min(1).max(140).optional(),
  isPublic: z.boolean(),
});

publicRouter.patch('/profile/public', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = ProfileSchema.parse(req.body);
    const profile = await prisma.publicProfile.upsert({
      where: { userId: req.userId },
      update: { slug: body.slug, headline: body.headline, isPublic: body.isPublic },
      create: {
        userId: req.userId,
        slug: body.slug,
        headline: body.headline ?? 'My Technology Life',
        isPublic: body.isPublic,
      },
    });
    return res.json(profile);
  } catch (error) {
    return next(error);
  }
});

publicRouter.get('/u/:slug', async (req, res, next) => {
  try {
    const data = await getPublicTimeline(req.params.slug);
    if (!data) return res.status(404).json({ error: 'Public profile not found' });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});
