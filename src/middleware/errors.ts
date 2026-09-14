import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const message = err instanceof Error ? err.message : 'Unexpected error';
  const maybeStatus =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : undefined;
  const status = maybeStatus ?? (message.toLowerCase().includes('not found') ? 404 : 500);
  return res.status(status).json({ error: message });
}
