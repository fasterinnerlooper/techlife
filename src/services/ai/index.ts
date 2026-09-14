import { env } from '../../config/env.js';
import type { IAiProvider } from './types.js';
import { MockAiProvider } from './mockProvider.js';
import { OpenAiProvider } from './openAiProvider.js';

export function createAiProvider(): IAiProvider {
  if (env.AI_PROVIDER === 'openai') {
    return new OpenAiProvider();
  }
  return new MockAiProvider();
}
