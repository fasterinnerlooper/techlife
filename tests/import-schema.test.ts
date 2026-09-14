import { describe, expect, it } from 'vitest';
import { ExtractionResultSchema } from '../src/services/ai/types.js';
import { CreateImportSchema } from '../src/services/import/schema.js';

describe('extraction schema safety', () => {
  it('rejects malformed AI outputs', () => {
    expect(() => ExtractionResultSchema.parse({ foo: 'bar' })).toThrow();
  });

  describe('create import request validation', () => {
    it('allows URL import without content when sourceUrl exists', () => {
      const parsed = CreateImportSchema.parse({
        method: 'PASTE_URL',
        sourceUrl: 'https://example.com/post',
      });
      expect(parsed.method).toBe('PASTE_URL');
    });

    it('rejects URL import without sourceUrl', () => {
      expect(() => CreateImportSchema.parse({ method: 'PASTE_URL' })).toThrow();
    });

    it('requires content for non-URL import methods', () => {
      expect(() => CreateImportSchema.parse({ method: 'PASTE_TEXT', content: ' ' })).toThrow();
      expect(() => CreateImportSchema.parse({ method: 'UPLOAD_IMAGE' })).toThrow();
      expect(() =>
        CreateImportSchema.parse({
          method: 'PASTE_TEXT',
          content: 'I had a Nokia 3310',
        }),
      ).not.toThrow();
      expect(() =>
        CreateImportSchema.parse({
          method: 'PHOTO_COLLECTION',
          content: 'data:image/png;base64,abc123',
        }),
      ).not.toThrow();
    });
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
