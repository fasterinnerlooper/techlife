import axios from 'axios';
import { readFile } from 'node:fs/promises';
import { env } from '../../config/env.js';
import { ExtractionResultSchema, IAiProvider, type ExtractionInput } from './types.js';

const promptPath = new URL('../../prompts/v1/extraction_prompt.txt', import.meta.url);

export class OpenAiProvider implements IAiProvider {
  name = 'openai';

  async extractOwnership(input: ExtractionInput) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing while AI_PROVIDER=openai');
    }

    const systemPrompt = await readFile(promptPath, 'utf-8');
    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: input.mode === 'image' ? env.AI_MODEL_VISION : env.AI_MODEL_TEXT,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
          {
            role: 'user',
            content:
              input.mode === 'image'
                ? [
                    { type: 'input_text', text: `Source: ${input.sourceLabel ?? 'unknown'}` },
                    { type: 'input_image', image_url: input.content },
                  ]
                : [{ type: 'input_text', text: `Source: ${input.sourceLabel ?? 'unknown'}\n\n${input.content}` }],
          },
        ],
      },
      {
        headers: {
          Authorization: 'Bearer ' + env.OPENAI_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      },
    );

    const outputs = Array.isArray(response.data?.output) ? response.data.output : [];
    const text = outputs
      .flatMap((entry: { content?: Array<{ type?: string; text?: string }> }) => entry.content ?? [])
      .filter((part: { type?: string; text?: string }) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part: { text?: string }) => part.text ?? '')
      .join('\n')
      .trim();
    const parsed = text ? JSON.parse(text) : { items: [] };
    return ExtractionResultSchema.parse(parsed);
  }
}
