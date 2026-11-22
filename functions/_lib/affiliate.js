import {
  extractBearerToken,
  jsonResponse,
  sha256Hex,
  timingSafeEqualHex,
} from './license.js';

const AFF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function normalizeAffiliateCode(input) {
  return String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

export function generateAffiliateCode(name = '') {
  const prefix = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4) || 'FP';

  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const suffix = [...bytes].map((b) => AFF_ALPHABET[b % AFF_ALPHABET.length]).join('');
  return `${prefix}-${suffix}`;
}

export function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function verifyAdminAuth(request, env) {
  const secret = String(env?.ADMIN_SECRET || '').trim();
  if (!secret) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'ADMIN_SECRET belum dikonfigurasi di server.' }, 500) };
  }

  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Token admin diperlukan.' }, 401) };
  }

  const [expectedHash, actualHash] = await Promise.all([
    sha256Hex(secret),
    sha256Hex(token),
  ]);

  if (!timingSafeEqualHex(expectedHash, actualHash)) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Token admin tidak valid.' }, 401) };
  }

  return { ok: true };
}
