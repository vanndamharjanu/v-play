import { jsonResponse } from '../../_lib/license.js';
import { isValidHttpUrl, verifyAdminAuth } from '../../_lib/affiliate.js';
import {
  generatePortalToken,
  isTenantExpired,
  normalizeHexColor,
  normalizeHostname,
} from '../../_lib/tenant.js';

function mapTenantRow(row) {
  return {
    id: row.id,
    hostname: row.hostname,
    brandName: row.brand_name,
    tagline: row.tagline,
    themePreset: row.theme_preset,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    lynkUrl: row.lynk_url,
    hasMerchantKey: Boolean(row.lynk_merchant_key),
    emailFrom: row.email_from,
    portalToken: row.portal_token,
    active: Boolean(row.active),
    expired: isTenantExpired(row),
    expiresAt: row.expires_at || '',
    createdAt: row.created_at,
  };
}

function isValidDateOrEmpty(val) {
  const s = String(val || '').trim();
  if (!s) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return auth.response;
  if (!env?.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terkonfigurasi.' }, 500);
  }

  const { results } = await env.DB.prepare(
    'SELECT * FROM tenants ORDER BY id DESC'
  ).all();

  return jsonResponse({
    ok: true,
    tenants: (results || []).map(mapTenantRow),
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

  const hostname = normalizeHostname(body?.hostname);
  const brandName = String(body?.brandName || '').trim().slice(0, 60);
  const tagline = String(body?.tagline || 'Kosakata anak 1-5 tahun').trim().slice(0, 80);
  const lynkUrl = String(body?.lynkUrl || '').trim();
  const emailFrom = String(body?.emailFrom || '').trim().slice(0, 120);
  const expiresAt = String(body?.expiresAt || '').trim();
  const primaryColor = normalizeHexColor(body?.primaryColor, '#007C91');
  const accentColor = normalizeHexColor(body?.accentColor, '#86DC62');

  if (!hostname || !hostname.includes('.')) {
    return jsonResponse({ ok: false, error: 'Domain/hostname tidak valid (contoh: belajarkids.id).' }, 400);
  }
  if (!brandName) {
    return jsonResponse({ ok: false, error: 'Nama brand wajib diisi.' }, 400);
  }
  if (lynkUrl && !isValidHttpUrl(lynkUrl)) {
    return jsonResponse({ ok: false, error: 'Link Lynk.id harus berupa URL http/https yang valid.' }, 400);
  }
  if (!isValidDateOrEmpty(expiresAt)) {
    return jsonResponse({ ok: false, error: 'Format tanggal berakhir harus YYYY-MM-DD.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM tenants WHERE hostname = ? LIMIT 1')
    .bind(hostname)
    .first();
  if (existing) {
    return jsonResponse({ ok: false, error: `Domain "${hostname}" sudah terdaftar.` }, 409);
  }

  const portalToken = generatePortalToken();
  await env.DB.prepare(
    `INSERT INTO tenants (hostname, brand_name, tagline, primary_color, accent_color, lynk_url, email_from, portal_token, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(hostname, brandName, tagline, primaryColor, accentColor, lynkUrl, emailFrom, portalToken, expiresAt)
    .run();

  const created = await env.DB.prepare('SELECT * FROM tenants WHERE hostname = ? LIMIT 1')
    .bind(hostname)
    .first();

  return jsonResponse({ ok: true, tenant: mapTenantRow(created) }, 201);
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

  const hostname = normalizeHostname(body?.hostname);
  if (!hostname) {
    return jsonResponse({ ok: false, error: 'Hostname wajib diisi.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT * FROM tenants WHERE hostname = ? LIMIT 1')
    .bind(hostname)
    .first();
  if (!existing) {
    return jsonResponse({ ok: false, error: 'Tenant tidak ditemukan.' }, 404);
  }

  const nextBrandName = body?.brandName !== undefined
    ? String(body.brandName).trim().slice(0, 60)
    : existing.brand_name;
  const nextActive = body?.active !== undefined ? (body.active ? 1 : 0) : existing.active;
  const nextExpiresAt = body?.expiresAt !== undefined
    ? String(body.expiresAt).trim()
    : existing.expires_at;
  const nextEmailFrom = body?.emailFrom !== undefined
    ? String(body.emailFrom).trim().slice(0, 120)
    : existing.email_from;
  const nextPortalToken = body?.regenerateToken ? generatePortalToken() : existing.portal_token;

  if (!nextBrandName) {
    return jsonResponse({ ok: false, error: 'Nama brand tidak boleh kosong.' }, 400);
  }
  if (!isValidDateOrEmpty(nextExpiresAt)) {
    return jsonResponse({ ok: false, error: 'Format tanggal berakhir harus YYYY-MM-DD.' }, 400);
  }

  await env.DB.prepare(
    `UPDATE tenants
     SET brand_name = ?, active = ?, expires_at = ?, email_from = ?, portal_token = ?
     WHERE hostname = ?`
  )
    .bind(nextBrandName, nextActive, nextExpiresAt, nextEmailFrom, nextPortalToken, hostname)
    .run();

  const updated = await env.DB.prepare('SELECT * FROM tenants WHERE hostname = ? LIMIT 1')
    .bind(hostname)
    .first();

  return jsonResponse({ ok: true, tenant: mapTenantRow(updated) });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return auth.response;
  if (!env?.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terkonfigurasi.' }, 500);
  }

  let hostname = normalizeHostname(new URL(request.url).searchParams.get('hostname'));
  if (!hostname) {
    try {
      const body = await request.json();
      hostname = normalizeHostname(body?.hostname);
    } catch {
      // Ignore empty body
    }
  }

  if (!hostname) {
    return jsonResponse({ ok: false, error: 'Hostname wajib diisi.' }, 400);
  }

  const res = await env.DB.prepare('DELETE FROM tenants WHERE hostname = ?')
    .bind(hostname)
    .run();

  if (!res?.meta?.changes) {
    return jsonResponse({ ok: false, error: 'Tenant tidak ditemukan.' }, 404);
  }

  return jsonResponse({ ok: true, deleted: hostname });
}
