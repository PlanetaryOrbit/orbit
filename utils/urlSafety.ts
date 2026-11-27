import dns from 'dns/promises';
import { isIP } from 'net';

function isPrivateAddress(address: string): boolean {
  if (address.startsWith('::ffff:')) return isPrivateAddress(address.slice(7));

  const version = isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      return true;
    }
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80') ||
      normalized.startsWith('ff')
    );
  }

  return true;
}

export async function safeExternalUrl(
  raw: string,
  allowedHostnames: string[],
): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;

  const hostname = url.hostname.toLowerCase();
  if (!allowedHostnames.map((h) => h.toLowerCase()).includes(hostname)) return null;

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) return null;
  } else {
    const addresses = await dns.lookup(hostname, { all: true }).catch(() => []);
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      return null;
    }
  }

  const safe = new URL('https://' + hostname);
  safe.port = url.port;
  safe.pathname = url.pathname;
  safe.search = url.search;
  safe.hash = url.hash;

  return safe;
}

/** Read a response body in chunks, cancelling as soon as the limit is exceeded. */
export async function readLimitedBody(
  response: Response,
  maxBytes: number,
): Promise<Buffer | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks: Buffer[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }

      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks, total);
  } finally {
    reader.releaseLock();
  }
}
