export type ParsedQr =
  | { kind: 'attendance'; activityId: string; token: string }
  | { kind: 'join'; activityId: string };

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(padded[i]);
    const c2 = BASE64_CHARS.indexOf(padded[i + 1]);
    const c3 = padded[i + 2] === '=' ? -1 : BASE64_CHARS.indexOf(padded[i + 2]);
    const c4 = padded[i + 3] === '=' ? -1 : BASE64_CHARS.indexOf(padded[i + 3]);
    if (c1 < 0 || c2 < 0) return '';
    bytes.push((c1 << 2) | (c2 >> 4));
    if (c3 >= 0) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    if (c4 >= 0) bytes.push(((c3 & 3) << 6) | c4);
  }
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  return String.fromCharCode(...bytes);
}

export function buildGroupJoinQr(activityId: string) {
  return `GOMATE_JOIN:${activityId}`;
}

export function qrImageUrl(data: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

export function parseGoMateQr(raw: string): ParsedQr | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('GMQR1.')) {
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    try {
      const json = decodeBase64Url(parts[1]);
      const data = JSON.parse(json) as { a?: string };
      if (typeof data?.a === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(data.a)) {
        return { kind: 'attendance', activityId: data.a, token: value };
      }
    } catch {
      return null;
    }
    return null;
  }

  const joinPrefix = /^GOMATE_JOIN:([a-zA-Z0-9_-]{1,100})$/.exec(value);
  if (joinPrefix) {
    return { kind: 'join', activityId: joinPrefix[1] };
  }

  const linkMatch = /\/app\/[^/]+\/(?:activityDetail|group)\/([a-zA-Z0-9_%-]{1,120})/.exec(value);
  if (linkMatch) {
    try {
      const id = decodeURIComponent(linkMatch[1]);
      if (/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return { kind: 'join', activityId: id };
    } catch {
      return null;
    }
  }

  return null;
}
