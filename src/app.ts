import 'dotenv/config';
import express from 'express';
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

app.use(helmet());
app.use(
  cors({
    origin: true,
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
app.use('/api/auth', authRouter);
app.use('/api/imports', importsRouter);
app.use('/api/ownership-records', ownershipRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api', publicRouter);

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head><title>Techlife</title></head><body>
  <h1>Remember everything you've ever owned.</h1>
  <p>Build a timeline of the technology that shaped your life.</p>
  <p>Use the API to import your history and build your timeline.</p>
  </body></html>`);
});

app.use(errorHandler);
