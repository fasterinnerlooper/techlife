import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import { parseDateHint } from '../utils/dates.js';
import { resolveCanonicalProduct } from '../services/import/resolution.js';

const ManualOwnershipSchema = z.object({
  product: z.string().min(1),
  manufacturer: z.string().optional(),
  categoryKey: z.string().optional(),
  startDateText: z.string().optional(),
  endDateText: z.string().optional(),
  notes: z.string().max(4000).optional(),
  memories: z.string().max(4000).optional(),
  isPrivate: z.boolean().default(true),
});

export const ownershipRouter = Router();
ownershipRouter.use(requireAuth);

ownershipRouter.post('/', async (req, res, next) => {
  try {
    const body = ManualOwnershipSchema.parse(req.body);
    const canonical = await resolveCanonicalProduct({
      extractedName: body.product,
      manufacturer: body.manufacturer,
      categoryKey: body.categoryKey,
    });

    const start = parseDateHint(body.startDateText);
    const end = parseDateHint(body.endDateText);

    const record = await prisma.ownershipRecord.create({
      data: {
        userId: req.userId!,
        canonicalProductId: canonical.id,
        startDate: start.date,
        startDateText: start.text,
        startDatePrecision: start.precision,
        endDate: end.date,
        endDateText: end.text,
        endDatePrecision: end.precision,
        notes: body.notes,
        memories: body.memories,
        confidenceScore: 1,
        isPrivate: body.isPrivate,
      },
    });

    return res.status(201).json(record);
  } catch (error) {
    return next(error);
  }
});
