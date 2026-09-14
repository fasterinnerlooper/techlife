import { CandidateStatus, ImportMethod, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { stableHash } from '../../utils/hash.js';
import { parseDateHint } from '../../utils/dates.js';
import { createAiProvider } from '../ai/index.js';
import { fetchImportableUrl } from './urlImport.js';
import { resolveCanonicalProduct } from './resolution.js';

const aiProvider = createAiProvider();

type DuplicateMatch = {
  ownershipId: string;
  product: string;
  manufacturer: string;
  startDateText: string | null;
  endDateText: string | null;
  sourceSummary: string | null;
  confidenceScore: number;
};

function categorizeCandidate(confidence: number, ambiguousCount: number, duplicateCount: number): CandidateStatus {
  if (duplicateCount > 0) return CandidateStatus.POSSIBLE_DUPLICATE;
  if (ambiguousCount > 0) return CandidateStatus.NEEDS_REVIEW;
  if (confidence >= 0.8) return CandidateStatus.CONFIRMED;
  if (confidence >= 0.5) return CandidateStatus.NEEDS_REVIEW;
  return CandidateStatus.POSSIBLE_DUPLICATE;
}

async function findDuplicateMatches(params: {
  userId: string;
  canonicalProductId: string | null;
}): Promise<DuplicateMatch[]> {
  if (!params.canonicalProductId) return [];

  const records = await prisma.ownershipRecord.findMany({
    where: {
      userId: params.userId,
      canonicalProductId: params.canonicalProductId,
    },
    include: {
      canonicalProduct: {
        include: {
          manufacturer: true,
        },
      },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    take: 5,
  });

  return records.map((record) => ({
    ownershipId: record.id,
    product: record.canonicalProduct.name,
    manufacturer: record.canonicalProduct.manufacturer.name,
    startDateText: record.startDateText,
    endDateText: record.endDateText,
    sourceSummary: record.sourceSummary,
    confidenceScore: record.confidenceScore,
  }));
}

export async function createImportAndCandidates(input: {
  userId: string;
  method: ImportMethod;
  sourceLabel?: string;
  sourceUrl?: string;
  content?: string;
}) {
  const normalizedContent =
    input.method === ImportMethod.PASTE_URL && input.sourceUrl ? await fetchImportableUrl(input.sourceUrl) : input.content ?? '';

  const importEntity = await prisma.import.create({
    data: {
      userId: input.userId,
      method: input.method,
      status: 'processing',
      sources: {
        create: {
          sourceType: input.method,
          sourceLabel: input.sourceLabel,
          sourceUrl: input.sourceUrl,
          sourceText: normalizedContent,
          sourceHash: stableHash(normalizedContent),
        },
      },
    },
    include: { sources: true },
  });

  const source = importEntity.sources[0];
  const requestHash = stableHash(`${source.sourceHash}:${aiProvider.name}`);

  const existingJob = await prisma.aIJob.findFirst({
    where: { requestHash, provider: aiProvider.name, import: { userId: input.userId } },
    orderBy: { createdAt: 'desc' },
  });

  let extraction;
  if (existingJob?.responseJson) {
    extraction = existingJob.responseJson as { items: any[] };
  } else {
    extraction = await aiProvider.extractOwnership({
      mode:
        input.method === ImportMethod.UPLOAD_IMAGE || input.method === ImportMethod.PHOTO_COLLECTION
          ? 'image'
          : input.method === ImportMethod.PASTE_URL
            ? 'url'
            : 'text',
      content: normalizedContent,
      sourceLabel: input.sourceLabel ?? input.sourceUrl,
    });

    await prisma.aIJob.upsert({
      where: {
        importId_requestHash: { importId: importEntity.id, requestHash },
      },
      update: {
        status: 'completed',
        responseJson: extraction as unknown as Prisma.InputJsonValue,
      },
      create: {
        importId: importEntity.id,
        provider: aiProvider.name,
        model: input.method === ImportMethod.UPLOAD_IMAGE ? 'vision' : 'text',
        status: 'completed',
        requestHash,
        responseJson: extraction as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const createdCandidates = [];
  for (const item of extraction.items) {
    const canonical = await resolveCanonicalProduct({
      extractedName: item.extractedName,
      manufacturer: item.manufacturer,
      categoryKey: item.categoryKey,
    });
    const duplicateMatches = await findDuplicateMatches({
      userId: input.userId,
      canonicalProductId: canonical.id,
    });
    const start = parseDateHint(item.startDateText);
    const end = parseDateHint(item.endDateText);
    const ambiguityPayload = {
      ambiguousModels: item.ambiguousModels,
      duplicateMatches,
    };

    const candidate = await prisma.extractedCandidate.create({
      data: {
        importId: importEntity.id,
        canonicalProductId: canonical.id,
        extractedName: item.extractedName,
        manufacturer: item.manufacturer,
        categoryKey: item.categoryKey,
        startDateText: start.text,
        endDateText: end.text,
        startDatePrecision: start.precision,
        endDatePrecision: end.precision,
        ownershipStatus: item.ownershipStatus,
        confidenceScore: item.confidenceScore,
        status: categorizeCandidate(item.confidenceScore, item.ambiguousModels.length, duplicateMatches.length),
        ambiguityJson: ambiguityPayload as unknown as Prisma.InputJsonValue,
        evidenceJson: item.evidenceSnippets as unknown as Prisma.InputJsonValue,
        reasoning: item.reasoning,
      },
    });

    createdCandidates.push(candidate);
  }

  await prisma.import.update({
    where: { id: importEntity.id },
    data: { status: 'processed', foundCount: createdCandidates.length },
  });

  return {
    importId: importEntity.id,
    found: createdCandidates.length,
    summary: {
      confirmed: createdCandidates.filter((c) => c.status === CandidateStatus.CONFIRMED).length,
      needsReview: createdCandidates.filter((c) => c.status === CandidateStatus.NEEDS_REVIEW).length,
      possibleDuplicates: createdCandidates.filter((c) => c.status === CandidateStatus.POSSIBLE_DUPLICATE).length,
    },
  };
}

export async function getImportReview(userId: string, importId: string) {
  const data = await prisma.import.findFirst({
    where: { id: importId, userId },
    include: {
      candidates: {
        include: { import: { include: { sources: true } } },
      },
      sources: true,
    },
  });
  if (!data) return null;

  const grouped = {
    confirmed: data.candidates.filter((c) => c.status === CandidateStatus.CONFIRMED),
    needsReview: data.candidates.filter((c) => c.status === CandidateStatus.NEEDS_REVIEW),
    possibleDuplicates: data.candidates.filter((c) => c.status === CandidateStatus.POSSIBLE_DUPLICATE),
  };

  return {
    importId: data.id,
    found: data.foundCount,
    grouped,
    sources: data.sources,
  };
}

export async function confirmImportCandidates(
  userId: string,
  importId: string,
  confirmations: Array<{
    candidateId: string;
    overrideName?: string;
    overrideModel?: string;
    markDuplicateOfOwnershipId?: string;
    makePublic?: boolean;
  }>,
) {
  const importEntity = await prisma.import.findFirst({ where: { id: importId, userId }, include: { sources: true } });
  if (!importEntity) throw new Error('Import not found');

  const confirmedOwnershipIds: string[] = [];

  for (const confirmation of confirmations) {
    const candidate = await prisma.extractedCandidate.findFirst({
      where: { id: confirmation.candidateId, importId, import: { userId } },
    });
    if (!candidate) continue;

    if (confirmation.markDuplicateOfOwnershipId) {
      const duplicateTarget = await prisma.ownershipRecord.findFirst({
        where: { id: confirmation.markDuplicateOfOwnershipId, userId },
      });
      if (!duplicateTarget) {
        throw new Error('Duplicate target record not found');
      }

      const evidenceSnippets = Array.isArray(candidate.evidenceJson) ? (candidate.evidenceJson as string[]) : [];
      const uniqueSnippets = [...new Set(evidenceSnippets.map((snippet) => snippet.trim()).filter(Boolean))];
      let mergedEvidenceCount = 0;
      if (uniqueSnippets.length > 0) {
        const existingEvidence = await prisma.evidence.findMany({
          where: { ownershipRecordId: duplicateTarget.id },
          select: { snippet: true },
        });
        const existingSet = new Set(existingEvidence.map((entry) => entry.snippet));
        const newEvidenceRows: Array<{
          ownershipRecordId: string;
          importSourceId?: string;
          snippet: string;
          confidenceScore: number;
        }> = [];

        for (const snippet of uniqueSnippets) {
          if (existingSet.has(snippet)) continue;
          newEvidenceRows.push({
            ownershipRecordId: duplicateTarget.id,
            importSourceId: importEntity.sources[0]?.id,
            snippet,
            confidenceScore: candidate.confidenceScore,
          });
        }
        if (newEvidenceRows.length > 0) {
          await prisma.evidence.createMany({
            data: newEvidenceRows,
          });
          mergedEvidenceCount = newEvidenceRows.length;
        }
      }

      await prisma.extractedCandidate.update({
        where: { id: candidate.id },
        data: {
          status: CandidateStatus.POSSIBLE_DUPLICATE,
          ambiguityJson: {
            duplicateOfOwnershipId: duplicateTarget.id,
            resolvedAt: new Date().toISOString(),
            mergedEvidenceCount,
          },
        },
      });
      continue;
    }

    const correctedName = confirmation.overrideModel ?? confirmation.overrideName ?? candidate.extractedName;
    const hasNameOverride = correctedName !== candidate.extractedName;
    let canonicalId = candidate.canonicalProductId ?? null;
    let resolvedName = candidate.extractedName;

    if (hasNameOverride) {
      const canonical = await resolveCanonicalProduct({
        extractedName: correctedName,
        manufacturer: candidate.manufacturer ?? undefined,
        categoryKey: candidate.categoryKey ?? undefined,
      });
      if (canonical?.id) {
        canonicalId = canonical.id;
        resolvedName = correctedName;
      }
    }
    if (!canonicalId) {
      const fallbackCanonical = await resolveCanonicalProduct({
        extractedName: candidate.extractedName,
        manufacturer: candidate.manufacturer ?? undefined,
        categoryKey: candidate.categoryKey ?? undefined,
      });
      canonicalId = fallbackCanonical?.id ?? null;
    }
    if (!canonicalId) continue;

    const start = parseDateHint(candidate.startDateText);
    const end = parseDateHint(candidate.endDateText);

    const ownership = await prisma.ownershipRecord.create({
      data: {
        userId,
        canonicalProductId: canonicalId,
        ownershipStatus: candidate.ownershipStatus,
        startDate: start.date,
        startDateText: start.text,
        startDatePrecision: start.precision,
        endDate: end.date,
        endDateText: end.text,
        endDatePrecision: end.precision,
        confidenceScore: candidate.confidenceScore,
        notes: candidate.reasoning,
        sourceSummary: importEntity.sources.map((s) => s.sourceLabel ?? s.sourceUrl ?? s.sourceType).join(', '),
        isPrivate: confirmation.makePublic ? false : true,
      },
    });

    const evidenceSnippets = Array.isArray(candidate.evidenceJson) ? (candidate.evidenceJson as string[]) : [];
    for (const snippet of evidenceSnippets.slice(0, 5)) {
      await prisma.evidence.create({
        data: {
          ownershipRecordId: ownership.id,
          importSourceId: importEntity.sources[0]?.id,
          snippet,
          confidenceScore: candidate.confidenceScore,
        },
      });
    }

    await prisma.ownershipEvent.create({
      data: {
        ownershipRecordId: ownership.id,
        eventType: 'IMPORTED',
        happenedAt: start.date,
        happenedAtText: start.text,
        datePrecision: start.precision,
      },
    });

    await prisma.extractedCandidate.update({
      where: { id: candidate.id },
      data: {
        status: CandidateStatus.CONFIRMED,
        canonicalProductId: canonicalId,
        extractedName: resolvedName,
      },
    });

    confirmedOwnershipIds.push(ownership.id);
  }

  return { confirmedOwnershipIds };
}
