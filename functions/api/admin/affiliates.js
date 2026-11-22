import { jsonResponse } from '../../_lib/license.js';
import {
  generateAffiliateCode,
  isValidHttpUrl,
  normalizeAffiliateCode,
  verifyAdminAuth,
} from '../../_lib/affiliate.js';

function mapRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    lynkUrl: row.lynk_url,
    clicks: Number(row.clicks || 0),
    checkoutClicks: Number(row.checkout_clicks || 0),
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return auth.response;
  if (!env?.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terkonfigurasi.' }, 500);
  }

  const { results } = await env.DB.prepare(
    'SELECT id, code, name, lynk_url, clicks, checkout_clicks, active, created_at FROM affiliates ORDER BY id DESC'
  ).all();

  return jsonResponse({
    ok: true,
    affiliates: (results || []).map(mapRow),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return auth.response;
  if (!env?.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terkonfigurasi.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload JSON tidak valid.' }, 400);
  }

  const name = String(body?.name || '').trim().slice(0, 80);
  const lynkUrl = String(body?.lynkUrl || '').trim();
  const customCode = normalizeAffiliateCode(body?.code);

  if (!name) {
    return jsonResponse({ ok: false, error: 'Nama afiliator wajib diisi.' }, 400);
  }
  if (!isValidHttpUrl(lynkUrl)) {
    return jsonResponse({ ok: false, error: 'Link Lynk.id harus berupa URL http/https yang valid.' }, 400);
  }

  if (customCode) {
    const existing = await env.DB.prepare('SELECT id FROM affiliates WHERE code = ? LIMIT 1')
      .bind(customCode)
      .first();
    if (existing) {
      return jsonResponse({ ok: false, error: `Kode "${customCode}" sudah dipakai.` }, 409);
    }

    await env.DB.prepare(
      'INSERT INTO affiliates (code, name, lynk_url) VALUES (?, ?, ?)'
    )
      .bind(customCode, name, lynkUrl)
      .run();

    const created = await env.DB.prepare(
      'SELECT id, code, name, lynk_url, clicks, checkout_clicks, active, created_at FROM affiliates WHERE code = ? LIMIT 1'
    )
      .bind(customCode)
      .first();

    return jsonResponse({ ok: true, affiliate: mapRow(created) }, 201);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateAffiliateCode(name);
    try {
      await env.DB.prepare(
        'INSERT INTO affiliates (code, name, lynk_url) VALUES (?, ?, ?)'
      )
        .bind(candidate, name, lynkUrl)
        .run();

      const created = await env.DB.prepare(
        'SELECT id, code, name, lynk_url, clicks, checkout_clicks, active, created_at FROM affiliates WHERE code = ? LIMIT 1'
      )
        .bind(candidate)
        .first();

      return jsonResponse({ ok: true, affiliate: mapRow(created) }, 201);
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }

  return jsonResponse({ ok: false, error: 'Gagal membuat kode affiliate.' }, 500);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return auth.response;
  if (!env?.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terkonfigurasi.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload JSON tidak valid.' }, 400);
  }

  const code = normalizeAffiliateCode(body?.code);
  if (!code) {
    return jsonResponse({ ok: false, error: 'Kode affiliate wajib diisi.' }, 400);
  }

  const existing = await env.DB.prepare(
    'SELECT id, code, name, lynk_url, clicks, checkout_clicks, active, created_at FROM affiliates WHERE code = ? LIMIT 1'
  )
    .bind(code)
    .first();

  if (!existing) {
    return jsonResponse({ ok: false, error: 'Afiliator tidak ditemukan.' }, 404);
  }

  const nextName = body?.name !== undefined ? String(body.name).trim().slice(0, 80) : existing.name;
  const nextLynkUrl = body?.lynkUrl !== undefined ? String(body.lynkUrl).trim() : existing.lynk_url;
  const nextActive = body?.active !== undefined ? (body.active ? 1 : 0) : existing.active;

  if (!nextName) {
    return jsonResponse({ ok: false, error: 'Nama afiliator tidak boleh kosong.' }, 400);
  }
  if (!isValidHttpUrl(nextLynkUrl)) {
    return jsonResponse({ ok: false, error: 'Link Lynk.id harus berupa URL http/https yang valid.' }, 400);
  }

  await env.DB.prepare(
    'UPDATE affiliates SET name = ?, lynk_url = ?, active = ? WHERE code = ?'
  )
    .bind(nextName, nextLynkUrl, nextActive, code)
    .run();

  const updated = await env.DB.prepare(
    'SELECT id, code, name, lynk_url, clicks, checkout_clicks, active, created_at FROM affiliates WHERE code = ? LIMIT 1'
  )
    .bind(code)
    .first();

  return jsonResponse({ ok: true, affiliate: mapRow(updated) });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return auth.response;
  if (!env?.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terkonfigurasi.' }, 500);
  }

  const url = new URL(request.url);
  let code = normalizeAffiliateCode(url.searchParams.get('code'));
  if (!code) {
    try {
      const body = await request.json();
      code = normalizeAffiliateCode(body?.code);
    } catch {
      // Ignore empty body
    }
  }

  if (!code) {
    return jsonResponse({ ok: false, error: 'Kode affiliate wajib diisi.' }, 400);
  }

  const res = await env.DB.prepare('DELETE FROM affiliates WHERE code = ?')
    .bind(code)
    .run();

  if (!res?.meta?.changes) {
    return jsonResponse({ ok: false, error: 'Afiliator tidak ditemukan.' }, 404);
  }

  return jsonResponse({ ok: true, deleted: code });
}
