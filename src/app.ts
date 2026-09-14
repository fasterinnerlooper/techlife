import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { importsRouter } from './routes/imports.js';
import { ownershipRouter } from './routes/ownership.js';
import { timelineRouter } from './routes/timeline.js';
import { publicRouter } from './routes/public.js';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errors.js';

export const app = express();
const publicDir = path.join(process.cwd(), 'public');

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  }),
);

app.use('/health', healthRouter);
app.use(express.static(publicDir));
app.use('/api/auth', authRouter);
app.use('/api/imports', importsRouter);
app.use('/api/ownership-records', ownershipRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api', publicRouter);

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/u/:slug', (_req, res) => {
  res.sendFile(path.join(publicDir, 'share.html'));
});

app.use(errorHandler);
