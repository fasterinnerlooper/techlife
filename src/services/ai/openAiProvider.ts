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
            content: [{ type: 'input_text', text: `Source: ${input.sourceLabel ?? 'unknown'}\n\n${input.content}` }],
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

    const text = response.data?.output?.[0]?.content?.[0]?.text;
    const parsed = typeof text === 'string' ? JSON.parse(text) : { items: [] };
    return ExtractionResultSchema.parse(parsed);
  }
}
