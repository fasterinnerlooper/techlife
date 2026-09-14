import { CandidateStatus, ImportMethod, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { stableHash } from '../../utils/hash.js';
import { parseDateHint } from '../../utils/dates.js';
import { createAiProvider } from '../ai/index.js';
import { fetchImportableUrl } from './urlImport.js';
import { resolveCanonicalProduct } from './resolution.js';

const aiProvider = createAiProvider();

function categorizeCandidate(confidence: number, ambiguousCount: number): CandidateStatus {
  if (ambiguousCount > 0) return CandidateStatus.NEEDS_REVIEW;
  if (confidence >= 0.8) return CandidateStatus.CONFIRMED;
  if (confidence >= 0.5) return CandidateStatus.NEEDS_REVIEW;
  return CandidateStatus.POSSIBLE_DUPLICATE;
}

export async function createImportAndCandidates(input: {
  userId: string;
  method: ImportMethod;
  sourceLabel?: string;
  sourceUrl?: string;
  content: string;
}) {
  const normalizedContent =
    input.method === ImportMethod.PASTE_URL && input.sourceUrl ? await fetchImportableUrl(input.sourceUrl) : input.content;

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
        input.method === ImportMethod.UPLOAD_IMAGE || input.method === ImportMethod.PHOTO_COLLECTION ? 'image' : 'text',
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
    const start = parseDateHint(item.startDateText);
    const end = parseDateHint(item.endDateText);

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
        status: categorizeCandidate(item.confidenceScore, item.ambiguousModels.length),
        ambiguityJson: item.ambiguousModels as unknown as Prisma.InputJsonValue,
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

      await prisma.extractedCandidate.update({
        where: { id: candidate.id },
        data: {
          status: CandidateStatus.POSSIBLE_DUPLICATE,
          ambiguityJson: {
            duplicateOfOwnershipId: duplicateTarget.id,
            resolvedAt: new Date().toISOString(),
          },
        },
      });
      continue;
    }

    const canonicalId = candidate.canonicalProductId;
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
      data: { status: CandidateStatus.CONFIRMED },
    });

    confirmedOwnershipIds.push(ownership.id);
  }

  return { confirmedOwnershipIds };
}
