import { DatePrecision } from '@prisma/client';

export type ParsedDateHint = {
  date: Date | null;
  text: string | null;
  precision: DatePrecision;
  approxYear: number | null;
};

const seasonMonthMap: Record<string, number> = {
  spring: 4,
  summer: 7,
  autumn: 10,
  fall: 10,
  winter: 1,
};

export function parseDateHint(input?: string | null): ParsedDateHint {
  if (!input) return { date: null, text: null, precision: DatePrecision.UNKNOWN, approxYear: null };
  const raw = input.trim();
  if (!raw) return { date: null, text: null, precision: DatePrecision.UNKNOWN, approxYear: null };

  const lower = raw.toLowerCase();
  const year = lower.match(/\b(19\d{2}|20\d{2}|2100)\b/);

  if (lower.startsWith('before ') && year) {
    return {
      date: new Date(`${year[1]}-01-01T00:00:00.000Z`),
      text: raw,
      precision: DatePrecision.BEFORE,
      approxYear: Number(year[1]),
    };
  }

  if (lower.startsWith('after ') && year) {
    return {
      date: new Date(`${year[1]}-12-31T00:00:00.000Z`),
      text: raw,
      precision: DatePrecision.AFTER,
      approxYear: Number(year[1]),
    };
  }

  for (const [season, month] of Object.entries(seasonMonthMap)) {
    if (lower.includes(season) && year) {
      return {
        date: new Date(`${year[1]}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`),
        text: raw,
        precision: DatePrecision.SEASON,
        approxYear: Number(year[1]),
      };
    }
  }

  if (year && raw.length <= 8) {
    return {
      date: new Date(`${year[1]}-01-01T00:00:00.000Z`),
      text: raw,
      precision: DatePrecision.YEAR,
      approxYear: Number(year[1]),
    };
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      date: parsed,
      text: raw,
      precision: DatePrecision.EXACT,
      approxYear: parsed.getUTCFullYear(),
    };
  }

  return { date: null, text: raw, precision: DatePrecision.RELATIVE, approxYear: null };
}

export function inferRangeYears(start?: string | null, end?: string | null): { start: number; end: number } {
  const s = parseDateHint(start);
  const e = parseDateHint(end);
  const startYear = s.approxYear ?? 1900;
  const endYear = e.approxYear ?? new Date().getUTCFullYear();
  return { start: startYear, end: Math.max(startYear, endYear) };
}

export function overlapsYear(startYear: number, endYear: number, targetYear: number): boolean {
  return startYear <= targetYear && endYear >= targetYear;
}
