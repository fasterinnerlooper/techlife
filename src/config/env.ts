import { z } from 'zod';

const RawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  AI_MODEL_TEXT: z.string().optional(),
  AI_MODEL_VISION: z.string().optional(),
  OPENAI_MODEL_TEXT: z.string().optional(),
  OPENAI_MODEL_VISION: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url().optional(),
  PUBLIC_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_MAX_MB: z.coerce.number().positive().optional(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().optional(),
  URL_IMPORT_TIMEOUT_MS: z.coerce.number().positive().default(7000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().positive().optional(),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().optional(),
});

export type AppEnv = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  AI_PROVIDER: 'mock' | 'openai';
  AI_MODEL_TEXT: string;
  AI_MODEL_VISION: string;
  OPENAI_API_KEY?: string;
  PUBLIC_BASE_URL: string;
  CORS_ORIGIN: string;
  UPLOAD_MAX_MB: number;
  URL_IMPORT_TIMEOUT_MS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
};

const rawEnv = RawEnvSchema.parse(process.env);

export const env: AppEnv = {
  NODE_ENV: rawEnv.NODE_ENV,
  PORT: rawEnv.PORT,
  DATABASE_URL: rawEnv.DATABASE_URL,
  JWT_SECRET: rawEnv.JWT_SECRET,
  AI_PROVIDER: rawEnv.AI_PROVIDER,
  AI_MODEL_TEXT: rawEnv.AI_MODEL_TEXT ?? rawEnv.OPENAI_MODEL_TEXT ?? 'mock-text',
  AI_MODEL_VISION: rawEnv.AI_MODEL_VISION ?? rawEnv.OPENAI_MODEL_VISION ?? 'mock-vision',
  OPENAI_API_KEY: rawEnv.OPENAI_API_KEY,
  PUBLIC_BASE_URL: rawEnv.PUBLIC_BASE_URL ?? rawEnv.PUBLIC_URL ?? 'http://localhost:3000',
  CORS_ORIGIN: rawEnv.CORS_ORIGIN,
  UPLOAD_MAX_MB: rawEnv.UPLOAD_MAX_MB ?? rawEnv.MAX_UPLOAD_SIZE_MB ?? 10,
  URL_IMPORT_TIMEOUT_MS: rawEnv.URL_IMPORT_TIMEOUT_MS,
  RATE_LIMIT_WINDOW_MS: rawEnv.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX: rawEnv.RATE_LIMIT_MAX ?? rawEnv.RATE_LIMIT_MAX_REQUESTS ?? 120,
};
