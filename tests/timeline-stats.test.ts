import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findManyOwnership } = vi.hoisted(() => ({
  findManyOwnership: vi.fn(),
}));

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    ownershipRecord: { findMany: findManyOwnership },
  },
}));

import { timelineStats } from '../src/services/timeline/timelineService.js';

describe('timelineStats', () => {
  beforeEach(() => {
    findManyOwnership.mockReset();
  });

  it('returns richer approximate statistics from uncertain ownership ranges', async () => {
    findManyOwnership.mockResolvedValue([
      {
        startDateText: '2001',
        endDateText: '2003',
        ownershipStatus: 'SOLD',
        purchasePrice: 199.99,
        canonicalProduct: {
          name: 'Nokia 3310',
          manufacturer: { name: 'Nokia' },
          category: { key: 'mobile-phones', label: 'Mobile phones' },
        },
      },
      {
        startDateText: '2004',
        endDateText: '2004',
        ownershipStatus: 'STILL_OWNED',
        purchasePrice: null,
        canonicalProduct: {
          name: 'Game Boy Color',
          manufacturer: { name: 'Nintendo' },
          category: { key: 'handheld-gaming-devices', label: 'Handheld gaming devices' },
        },
      },
      {
        startDateText: '2005',
        endDateText: '2008',
        ownershipStatus: 'SOLD',
        purchasePrice: 349.49,
        canonicalProduct: {
          name: 'Nokia N95',
          manufacturer: { name: 'Nokia' },
          category: { key: 'mobile-phones', label: 'Mobile phones' },
        },
      },
    ]);

    const stats = await timelineStats('user-1');

    expect(stats).toEqual(
      expect.objectContaining({
        totalDevices: 3,
        yearsRepresented: 8,
        mostUsedCategory: 'Mobile phones',
        categoryCount: 2,
        mostCommonManufacturer: 'Nokia',
        manufacturerCount: 2,
        currentlyOwned: 1,
        approximateTotalSpent: 549,
        averageOwnershipYears: 2.7,
        upgradeCount: 1,
        longestOwnedDevice: { product: 'Nokia N95', approximateYears: 4 },
        shortestOwnershipDevice: { product: 'Game Boy Color', approximateYears: 1 },
      }),
    );
  });
});
