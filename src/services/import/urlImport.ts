import axios from 'axios';
import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { env } from '../../config/env.js';

function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase().startsWith('::ffff:') ? ip.slice(7) : ip.toLowerCase();
  if (normalized !== ip) return isPrivateIp(normalized);

  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('0.') || ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('172.')) {
    const second = Number(ip.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith('224.') || ip.startsWith('239.') || ip.startsWith('255.')) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const literalIp = isIP(hostname) ? hostname : null;
  if (literalIp && isPrivateIp(literalIp)) {
    throw new Error('URL host is not publicly accessible');
  }

  if (!literalIp) {
    const addresses = await dns.lookup(hostname, { all: true });
    if (addresses.some((entry) => isPrivateIp(entry.address))) {
      throw new Error('URL host resolves to non-public address');
    }
  }
}

async function resolvePublicHost(hostname: string): Promise<{ address: string; family: number }> {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('URL host is not publicly accessible');
    return { address: hostname, family: isIP(hostname) };
  }

  const addresses = await dns.lookup(hostname, { all: true });
  const publicAddress = addresses.find((entry) => !isPrivateIp(entry.address));
  if (!publicAddress) throw new Error('URL host resolves to non-public address');
  return publicAddress;
}

export async function fetchImportableUrl(url: string): Promise<string> {
  let currentUrl = url;
  for (let hop = 0; hop < 4; hop += 1) {
    const parsed = new URL(currentUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only public http(s) URLs are supported');
    }
    if (parsed.username || parsed.password) {
      throw new Error('Credentialed URLs are not supported');
    }
    await assertPublicHost(parsed.hostname);
    const resolved = await resolvePublicHost(parsed.hostname);
    const lookup = (
      _hostname: string,
      _options: unknown,
      callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ): void => {
      callback(null, resolved.address, resolved.family);
    };

    const response = await axios.get(currentUrl, {
      timeout: env.URL_IMPORT_TIMEOUT_MS,
      maxRedirects: 0,
      httpAgent: new http.Agent({ lookup }),
      httpsAgent: new https.Agent({ lookup, servername: parsed.hostname }),
      headers: {
        'User-Agent': 'techlife-importer/1.0',
      },
      validateStatus: (status) => (status >= 200 && status < 400) || (status >= 300 && status < 400),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) throw new Error('Redirect response missing location');
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return typeof response.data === 'string' ? response.data.slice(0, 50000) : JSON.stringify(response.data);
  }

  throw new Error('Too many redirects');
}
