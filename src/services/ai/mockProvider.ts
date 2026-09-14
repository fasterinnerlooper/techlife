import { ExtractionResult, ExtractionResultSchema, IAiProvider, type ExtractionInput } from './types.js';

const known = [
  'nokia 3310',
  'nokia n95',
  'sony ericsson k750i',
  'blackberry pearl',
  'blackberry bold',
  'htc hd2',
  'iphone 3gs',
  'iphone',
  'playstation 3',
  'xbox 360',
  'nexus 5',
  'game boy color',
  'ipod mini',
];

export class MockAiProvider implements IAiProvider {
  name = 'mock';

  async extractOwnership(input: ExtractionInput): Promise<ExtractionResult> {
    const content = input.content.toLowerCase();
    const items = known
      .filter((device) => content.includes(device))
      .map((device) => {
        const yearMatch = content.match(new RegExp(`${device}[^\\n.]*?(19\\d{2}|20\\d{2})`));
        const date = yearMatch?.[1];
        return {
          extractedName: device.replace(/\b\w/g, (s) => s.toUpperCase()),
          confidenceScore: date ? 0.9 : 0.65,
          startDateText: date,
          endDateText: undefined,
          ownershipStatus: 'UNKNOWN' as const,
          evidenceSnippets: [device],
          ambiguousModels: [],
          manufacturer: undefined,
          categoryKey: undefined,
          provenanceLabel: input.sourceLabel,
          reasoning: 'Heuristic extraction from text content.',
        };
      });

    return ExtractionResultSchema.parse({ items });
  }
}
