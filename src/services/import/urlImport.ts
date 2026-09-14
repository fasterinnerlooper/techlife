import axios from 'axios';
import { env } from '../../config/env.js';

export async function fetchImportableUrl(url: string): Promise<string> {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only public http(s) URLs are supported');
  }
  const response = await axios.get(url, {
    timeout: env.URL_IMPORT_TIMEOUT_MS,
    maxRedirects: 3,
    headers: {
      'User-Agent': 'techlife-importer/1.0',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  return typeof response.data === 'string' ? response.data.slice(0, 50000) : JSON.stringify(response.data);
}
