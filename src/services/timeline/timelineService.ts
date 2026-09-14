import { prisma } from '../../db/prisma.js';
import { inferRangeYears, overlapsYear } from '../../utils/dates.js';

export async function listTimeline(userId: string) {
  const records = await prisma.ownershipRecord.findMany({
    where: { userId },
    include: {
      canonicalProduct: {
        include: { manufacturer: true, category: true },
      },
      evidence: true,
      photos: true,
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  });

  return records.map((r) => {
    const years = inferRangeYears(r.startDateText, r.endDateText);
    return {
      id: r.id,
      product: r.canonicalProduct.name,
      manufacturer: r.canonicalProduct.manufacturer.name,
      category: r.canonicalProduct.category.label,
      startDate: r.startDate,
      startDateText: r.startDateText,
      endDate: r.endDate,
      endDateText: r.endDateText,
      dateRange: years,
      confidenceScore: r.confidenceScore,
      ownershipStatus: r.ownershipStatus,
      notes: r.notes,
      memories: r.memories,
      isPrivate: r.isPrivate,
      provenance: r.evidence.map((e) => e.snippet),
    };
  });
}

export async function timelineStats(userId: string) {
  const records = await prisma.ownershipRecord.findMany({
    where: { userId },
    include: {
      canonicalProduct: {
        include: {
          manufacturer: true,
          category: true,
        },
      },
    },
  });

  if (records.length === 0) {
    return {
      totalDevices: 0,
      yearsRepresented: 0,
      mostUsedCategory: null,
      mostCommonManufacturer: null,
      currentlyOwned: 0,
      approximateTotalSpent: null,
    };
  }

  const yearRanges = records.map((r) => inferRangeYears(r.startDateText, r.endDateText));
  const minYear = Math.min(...yearRanges.map((y) => y.start));
  const maxYear = Math.max(...yearRanges.map((y) => y.end));

  const categoryCounts = new Map<string, number>();
  const manufacturerCounts = new Map<string, number>();
  let currentlyOwned = 0;
  let spent = 0;

  for (const r of records) {
    categoryCounts.set(r.canonicalProduct.category.label, (categoryCounts.get(r.canonicalProduct.category.label) ?? 0) + 1);
    manufacturerCounts.set(
      r.canonicalProduct.manufacturer.name,
      (manufacturerCounts.get(r.canonicalProduct.manufacturer.name) ?? 0) + 1,
    );
    if (r.ownershipStatus === 'STILL_OWNED') currentlyOwned += 1;
    if (r.purchasePrice) spent += Number(r.purchasePrice);
  }

  const pickTop = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalDevices: records.length,
    yearsRepresented: maxYear - minYear + 1,
    mostUsedCategory: pickTop(categoryCounts),
    mostCommonManufacturer: pickTop(manufacturerCounts),
    currentlyOwned,
    approximateTotalSpent: spent > 0 ? Math.round(spent) : null,
  };
}

export async function ownedAtYear(userId: string, year: number) {
  const timeline = await listTimeline(userId);
  return timeline.filter((record) => overlapsYear(record.dateRange.start, record.dateRange.end, year));
}

export async function getPublicTimeline(slug: string) {
  const profile = await prisma.publicProfile.findFirst({
    where: { slug, isPublic: true },
    include: { user: true },
  });

  if (!profile) return null;

  const records = await prisma.ownershipRecord.findMany({
    where: { userId: profile.userId, isPrivate: false },
    include: {
      canonicalProduct: { include: { manufacturer: true, category: true } },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  });

  return {
    profile: {
      slug: profile.slug,
      headline: profile.headline,
      username: profile.user.username,
    },
    stats: {
      devices: records.length,
      categories: new Set(records.map((r) => r.canonicalProduct.category.key)).size,
    },
    timeline: records.map((r) => ({
      product: r.canonicalProduct.name,
      manufacturer: r.canonicalProduct.manufacturer.name,
      category: r.canonicalProduct.category.label,
      startDateText: r.startDateText,
      endDateText: r.endDateText,
      ownershipStatus: r.ownershipStatus,
      memories: r.memories,
    })),
  };
}
