import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { listTimeline, ownedAtYear, timelineStats } from '../services/timeline/timelineService.js';

export const timelineRouter = Router();
timelineRouter.use(requireAuth);

const YearSchema = z.object({ year: z.coerce.number().int().min(1900).max(2200) });

timelineRouter.get('/', async (req, res, next) => {
  try {
    const timeline = await listTimeline(req.userId!);
    return res.json(timeline);
  } catch (error) {
    return next(error);
  }
});

timelineRouter.get('/stats', async (req, res, next) => {
  try {
    const stats = await timelineStats(req.userId!);
    return res.json(stats);
  } catch (error) {
    return next(error);
  }
});

timelineRouter.get('/owned-at', async (req, res, next) => {
  try {
    const { year } = YearSchema.parse(req.query);
    const result = await ownedAtYear(req.userId!, year);
    return res.json({ year, items: result });
  } catch (error) {
    return next(error);
  }
});
