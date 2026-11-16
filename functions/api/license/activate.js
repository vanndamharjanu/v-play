import { FULL_WORDS } from '../../_lib/catalog.js';
import {
  jsonResponse,
  normalizeCode,
  normalizeDeviceId,
  generateDeviceToken,
  sha256Hex,
} from '../../_lib/license.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terhubung.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Format permintaan tidak valid.' }, 400);
  }

  const code = normalizeCode(body?.code);
  const deviceId = normalizeDeviceId(body?.deviceId);
  if (!code || !deviceId) {
    return jsonResponse({ ok: false, error: 'Masukkan kode lisensi yang valid.' }, 400);
  }

  const license = await env.DB.prepare(
    'SELECT id, code, max_devices, status FROM licenses WHERE code = ? LIMIT 1'
  )
    .bind(code)
    .first();

  if (!license) {
    return jsonResponse(
      { ok: false, error: 'Kode lisensi tidak ditemukan. Periksa huruf dan tanda hubungnya.' },
      404
    );
  }

  if (license.status !== 'active') {
    return jsonResponse(
      { ok: false, error: 'Kode lisensi ini sedang dinonaktifkan.' },
      403
    );
  }

  const existingDevice = await env.DB.prepare(
    'SELECT id FROM license_devices WHERE license_id = ? AND device_id = ? LIMIT 1'
  )
    .bind(license.id, deviceId)
    .first();

  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM license_devices WHERE license_id = ?'
  )
    .bind(license.id)
    .first();

  const usedBefore = Number(countRow?.cnt || 0);
  if (!existingDevice && usedBefore >= license.max_devices) {
    return jsonResponse(
      {
        ok: false,
        error: `Kode ini sudah terpasang di batas maksimal ${license.max_devices} perangkat.`,
      },
      403
    );
  }

  const token = generateDeviceToken();
  const tokenHash = await sha256Hex(token);
  const ua = String(request.headers.get('User-Agent') || '').slice(0, 160);

  if (existingDevice) {
    await env.DB.prepare(
      "UPDATE license_devices SET token_hash = ?, user_agent = ?, last_seen_at = datetime('now') WHERE id = ?"
    )
      .bind(tokenHash, ua, existingDevice.id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO license_devices (license_id, device_id, token_hash, user_agent)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(license_id, device_id) DO UPDATE SET
         token_hash = excluded.token_hash,
         user_agent = excluded.user_agent,
         last_seen_at = datetime('now')`
    )
      .bind(license.id, deviceId, tokenHash, ua)
      .run();

    const afterCountRow = await env.DB.prepare(
      'SELECT COUNT(*) AS cnt FROM license_devices WHERE license_id = ?'
    )
      .bind(license.id)
      .first();
    if (Number(afterCountRow?.cnt || 0) > license.max_devices) {
      await env.DB.prepare('DELETE FROM license_devices WHERE token_hash = ?').bind(tokenHash).run();
      return jsonResponse(
        {
          ok: false,
          error: `Kode ini sudah terpasang di batas maksimal ${license.max_devices} perangkat.`,
        },
        403
      );
    }
  }

  const finalCount = await env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM license_devices WHERE license_id = ?'
  )
    .bind(license.id)
    .first();

  return jsonResponse({
    ok: true,
    token,
    usedDevices: Number(finalCount?.cnt || 1),
    maxDevices: license.max_devices,
    catalog: FULL_WORDS,
  });
}
