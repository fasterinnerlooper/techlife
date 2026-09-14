import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  importFindFirst: vi.fn(),
  candidateFindFirst: vi.fn(),
  candidateUpdate: vi.fn(),
  ownershipFindFirst: vi.fn(),
  ownershipCreate: vi.fn(),
  evidenceFindMany: vi.fn(),
  evidenceCreate: vi.fn(),
  evidenceCreateMany: vi.fn(),
  eventCreate: vi.fn(),
  resolveCanonicalProduct: vi.fn(),
  parseDateHint: vi.fn(),
}));

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    import: { findFirst: mocks.importFindFirst },
    extractedCandidate: { findFirst: mocks.candidateFindFirst, update: mocks.candidateUpdate },
    ownershipRecord: { findFirst: mocks.ownershipFindFirst, create: mocks.ownershipCreate },
    evidence: {
      findMany: mocks.evidenceFindMany,
      create: mocks.evidenceCreate,
      createMany: mocks.evidenceCreateMany,
    },
    ownershipEvent: { create: mocks.eventCreate },
  },
}));

vi.mock('../src/services/import/resolution.js', () => ({
  resolveCanonicalProduct: mocks.resolveCanonicalProduct,
}));

vi.mock('../src/utils/dates.js', () => ({
  parseDateHint: mocks.parseDateHint,
}));

import { confirmImportCandidates } from '../src/services/import/importService.js';

describe('confirmImportCandidates', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mockFn) => mockFn.mockReset());
    mocks.importFindFirst.mockResolvedValue({
      id: 'import-1',
      userId: 'user-1',
      sources: [{ id: 'source-1', sourceType: 'PASTE_TEXT', sourceLabel: 'Test source' }],
    });
    mocks.parseDateHint.mockImplementation((text?: string) => ({
      text: text ?? undefined,
      date: null,
      precision: 'UNKNOWN',
    }));
  });

  it('applies override model/name during confirmation', async () => {
    mocks.candidateFindFirst.mockResolvedValue({
      id: 'candidate-1',
      importId: 'import-1',
      extractedName: 'HTC One',
      manufacturer: 'HTC',
      categoryKey: 'mobile-phones',
      startDateText: '2013',
      endDateText: undefined,
      ownershipStatus: 'UNKNOWN',
      confidenceScore: 0.9,
      evidenceJson: ['Owned this in 2013'],
      reasoning: 'Strong evidence',
    });
    mocks.resolveCanonicalProduct.mockResolvedValue({ id: 'canonical-1' });
    mocks.ownershipCreate.mockResolvedValue({ id: 'ownership-1' });

    const result = await confirmImportCandidates('user-1', 'import-1', [
      { candidateId: 'candidate-1', overrideModel: 'HTC One M8' },
    ]);

    expect(mocks.resolveCanonicalProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        extractedName: 'HTC One M8',
      }),
    );
    expect(mocks.candidateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          extractedName: 'HTC One M8',
          canonicalProductId: 'canonical-1',
        }),
      }),
    );
    expect(result.confirmedOwnershipIds).toEqual(['ownership-1']);
  });

  it('merges new evidence snippets when marking duplicates', async () => {
    mocks.candidateFindFirst.mockResolvedValue({
      id: 'candidate-2',
      importId: 'import-1',
      extractedName: 'Nokia N95',
      confidenceScore: 0.8,
      evidenceJson: ['N95 in 2007', 'N95 in 2007', 'Used until 2009'],
    });
    mocks.ownershipFindFirst.mockResolvedValue({ id: 'ownership-42', userId: 'user-1' });
    mocks.evidenceFindMany.mockResolvedValue([{ snippet: 'N95 in 2007' }]);

    await confirmImportCandidates('user-1', 'import-1', [
      { candidateId: 'candidate-2', markDuplicateOfOwnershipId: 'ownership-42' },
    ]);

    expect(mocks.evidenceCreateMany).toHaveBeenCalledTimes(1);
    expect(mocks.evidenceCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            ownershipRecordId: 'ownership-42',
            snippet: 'Used until 2009',
          }),
        ],
      }),
    );
    expect(mocks.candidateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'POSSIBLE_DUPLICATE',
        }),
      }),
    );
  });
});
