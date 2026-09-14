import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirstProfile, findManyOwnership } = vi.hoisted(() => ({
  findFirstProfile: vi.fn(),
  findManyOwnership: vi.fn(),
}));

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    publicProfile: { findFirst: findFirstProfile },
    ownershipRecord: { findMany: findManyOwnership },
  },
}));

import { getPublicTimeline } from '../src/services/timeline/timelineService.js';

describe('getPublicTimeline privacy behavior', () => {
  beforeEach(() => {
    findFirstProfile.mockReset();
    findManyOwnership.mockReset();
  });

  it('returns null when profile is not public or missing', async () => {
    findFirstProfile.mockResolvedValue(null);
    const result = await getPublicTimeline('hidden-user');
    expect(result).toBeNull();
    expect(findManyOwnership).not.toHaveBeenCalled();
  });

  it('queries only non-private ownership records for public profile', async () => {
    findFirstProfile.mockResolvedValue({
      userId: 'u1',
      slug: 'public-user',
      headline: 'My Technology Life',
      user: { username: 'public-user' },
    });
    findManyOwnership.mockResolvedValue([]);

    await getPublicTimeline('public-user');

    expect(findManyOwnership).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', isPrivate: false },
      }),
    );
  });
});
