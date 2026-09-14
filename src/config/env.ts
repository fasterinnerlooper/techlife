import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  AI_MODEL_TEXT: z.string().default('mock-text'),
  AI_MODEL_VISION: z.string().default('mock-vision'),
  OPENAI_API_KEY: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(10),
  URL_IMPORT_TIMEOUT_MS: z.coerce.number().positive().default(7000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().positive().default(120),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse(process.env);
