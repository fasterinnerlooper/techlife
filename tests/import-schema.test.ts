import { describe, expect, it } from 'vitest';
import { ExtractionResultSchema } from '../src/services/ai/types.js';

describe('extraction schema safety', () => {
  it('rejects malformed AI outputs', () => {
    expect(() => ExtractionResultSchema.parse({ foo: 'bar' })).toThrow();
  });

  it('accepts valid structured output', () => {
    const parsed = ExtractionResultSchema.parse({
      items: [
        {
          extractedName: 'Nokia 3310',
          confidenceScore: 0.9,
          ownershipStatus: 'UNKNOWN',
          evidenceSnippets: ['I had a Nokia 3310 around 2001'],
          ambiguousModels: [],
        },
      ],
    });
    expect(parsed.items).toHaveLength(1);
  });
});
