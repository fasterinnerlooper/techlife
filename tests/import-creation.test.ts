import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  importCreate: vi.fn(),
  importUpdate: vi.fn(),
  aiJobFindFirst: vi.fn(),
  aiJobUpsert: vi.fn(),
  candidateCreate: vi.fn(),
  ownershipFindMany: vi.fn(),
  resolveCanonicalProduct: vi.fn(),
  parseDateHint: vi.fn(),
  extractOwnership: vi.fn(),
}));

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    import: { create: mocks.importCreate, update: mocks.importUpdate },
    aIJob: { findFirst: mocks.aiJobFindFirst, upsert: mocks.aiJobUpsert },
    extractedCandidate: { create: mocks.candidateCreate },
    ownershipRecord: { findMany: mocks.ownershipFindMany },
  },
}));

vi.mock('../src/services/import/resolution.js', () => ({
  resolveCanonicalProduct: mocks.resolveCanonicalProduct,
}));

vi.mock('../src/utils/dates.js', () => ({
  parseDateHint: mocks.parseDateHint,
}));

vi.mock('../src/services/ai/index.js', () => ({
  createAiProvider: () => ({
    name: 'mock',
    extractOwnership: mocks.extractOwnership,
  }),
}));

import { createImportAndCandidates } from '../src/services/import/importService.js';

describe('createImportAndCandidates', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mockFn) => mockFn.mockReset());
    mocks.importCreate.mockResolvedValue({
      id: 'import-1',
      sources: [{ id: 'source-1', sourceHash: 'hash-1', sourceType: 'PASTE_TEXT' }],
    });
    mocks.aiJobFindFirst.mockResolvedValue(null);
    mocks.aiJobUpsert.mockResolvedValue(undefined);
    mocks.parseDateHint.mockImplementation((text?: string) => ({
      text: text ?? null,
      date: null,
      precision: 'UNKNOWN',
    }));
    mocks.resolveCanonicalProduct.mockResolvedValue({ id: 'canonical-1' });
    mocks.candidateCreate.mockImplementation(async ({ data }) => ({ id: 'candidate-1', status: data.status }));
  });

  it('marks candidates as possible duplicates when matching ownership already exists', async () => {
    mocks.extractOwnership.mockResolvedValue({
      items: [
        {
          extractedName: 'Nokia N95',
          manufacturer: 'Nokia',
          categoryKey: 'mobile-phones',
          startDateText: '2007',
          ownershipStatus: 'UNKNOWN',
          confidenceScore: 0.92,
          evidenceSnippets: ['N95 in 2007'],
          ambiguousModels: [],
          reasoning: 'Confident extraction',
        },
      ],
    });
    mocks.ownershipFindMany.mockResolvedValue([
      {
        id: 'ownership-42',
        startDateText: '2007',
        endDateText: '2009',
        sourceSummary: 'Old forum signature',
        confidenceScore: 0.9,
        canonicalProduct: {
          name: 'Nokia N95',
          manufacturer: { name: 'Nokia' },
        },
      },
    ]);

    const result = await createImportAndCandidates({
      userId: 'user-1',
      method: 'PASTE_TEXT',
      content: 'I had a Nokia N95 in 2007.',
    });

    expect(result.summary.possibleDuplicates).toBe(1);
    expect(mocks.candidateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'POSSIBLE_DUPLICATE',
          ambiguityJson: expect.objectContaining({
            duplicateMatches: [
              expect.objectContaining({
                ownershipId: 'ownership-42',
                product: 'Nokia N95',
              }),
            ],
          }),
        }),
      }),
    );
  });
});
