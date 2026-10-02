import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  importFindFirst: vi.fn(),
}));

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    import: { findFirst: mocks.importFindFirst },
  },
}));

import { getImportStatus } from '../src/services/import/importService.js';

describe('getImportStatus', () => {
  beforeEach(() => {
    mocks.importFindFirst.mockReset();
  });

  it('returns a normalized status payload for an owned import', async () => {
    mocks.importFindFirst.mockResolvedValue({
      id: 'import-123',
      status: 'processed',
      foundCount: 3,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:05:00.000Z'),
    });

    await expect(getImportStatus('user-1', 'import-123')).resolves.toEqual({
      importId: 'import-123',
      status: 'processed',
      found: 3,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:05:00.000Z'),
    });
  });

  it('returns null when the import is missing or not owned by the user', async () => {
    mocks.importFindFirst.mockResolvedValue(null);

    await expect(getImportStatus('user-1', 'missing')).resolves.toBeNull();
  });
});
