import { FULL_WORDS } from '../_lib/catalog.js';
import { jsonResponse, extractBearerToken, sha256Hex } from '../_lib/license.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terhubung.' }, 500);
  }

  const token = extractBearerToken(request);
  if (!token) {
    return jsonResponse({ ok: false, error: 'Token akses diperlukan.' }, 401);
  }

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT d.id AS dev_id, d.license_id, l.max_devices, l.status
     FROM license_devices d
     JOIN licenses l ON l.id = d.license_id
     WHERE d.token_hash = ?
     LIMIT 1`
  )
    .bind(tokenHash)
    .first();

  if (!row || row.status !== 'active') {
    return jsonResponse({ ok: false, error: 'Akses tidak valid atau sudah dinonaktifkan.' }, 401);
  }

  await env.DB.prepare("UPDATE license_devices SET last_seen_at = datetime('now') WHERE id = ?")
    .bind(row.dev_id)
    .run();

  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM license_devices WHERE license_id = ?'
  )
    .bind(row.license_id)
    .first();

  return jsonResponse({
    ok: true,
    usedDevices: Number(countRow?.cnt || 1),
    maxDevices: row.max_devices,
    catalog: FULL_WORDS,
  });
}
