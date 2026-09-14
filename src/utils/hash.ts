import { createHash } from 'node:crypto';

export const stableHash = (input: string): string => createHash('sha256').update(input).digest('hex');
