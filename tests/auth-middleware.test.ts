import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middleware/auth.js';
import type { Request, Response } from 'express';

describe('requireAuth', () => {
  it('rejects missing bearer token', () => {
    const req = { headers: {} } as unknown as Request;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as unknown as Response;
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Missing bearer token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts valid bearer token', () => {
    const token = jwt.sign({ sub: 'user-123' }, 'test_secret_which_is_long_enough');
    const req = { headers: { authorization: 'Bearer ' + token } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test_secret_which_is_long_enough';

    requireAuth(req, res, next);

    process.env.JWT_SECRET = original;

    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed bearer token', () => {
    const req = { headers: { authorization: 'Bearer ' + 'not-a-jwt' } } as unknown as Request;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as unknown as Response;
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});
