import { extractBearerToken, jsonResponse } from '../../_lib/license.js';
import { isValidHttpUrl } from '../../_lib/affiliate.js';
import {
  THEME_PRESETS,
  isTenantExpired,
  normalizeHexColor,
} from '../../_lib/tenant.js';

function isValidImageOrEmpty(val) {
  const s = String(val || '').trim();
  if (!s) return true;
  if (s.length > 90000) return false;
  if (s.startsWith('data:image/')) {
    return /^data:image\/(png|jpeg|jpg|webp|svg\+xml|x-icon);base64,/i.test(s) || s.startsWith('data:image/svg+xml,');
  }
  return isValidHttpUrl(s);
}

async function authenticatePartner(request, env) {
  if (!env?.DB) {
    return { error: jsonResponse({ ok: false, error: 'Database belum terkonfigurasi.' }, 500) };
  }
  const token = extractBearerToken(request);
  if (!token) {
    return { error: jsonResponse({ ok: false, error: 'Token portal diperlukan.' }, 401) };
  }

  const tenant = await env.DB.prepare('SELECT * FROM tenants WHERE portal_token = ? LIMIT 1')
    .bind(token)
    .first();

  if (!tenant) {
    return { error: jsonResponse({ ok: false, error: 'Token portal tidak valid.' }, 401) };
  }
  if (isTenantExpired(tenant)) {
    return { error: jsonResponse({ ok: false, error: 'Langganan brand Anda sedang tidak aktif.' }, 403) };
  }
  return { tenant };
}

function serializePartnerTenant(row) {
  return {
    hostname: row.hostname,
    brandName: row.brand_name,
    tagline: row.tagline,
    iconUrl: row.icon_url || '',
    faviconUrl: row.favicon_url || '',
    themePreset: row.theme_preset || 'teal',
    primaryColor: row.primary_color || '#007C91',
    accentColor: row.accent_color || '#86DC62',
    lynkUrl: row.lynk_url || '',
    hasMerchantKey: Boolean(row.lynk_merchant_key),
    emailFrom: row.email_from || '',
    expiresAt: row.expires_at || '',
    webhookUrl: `https://${row.hostname}/api/webhook/lynk`,
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await authenticatePartner(request, env);
  if (auth.error) return auth.error;

  return jsonResponse({
    ok: true,
    tenant: serializePartnerTenant(auth.tenant),
    presets: THEME_PRESETS,
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const auth = await authenticatePartner(request, env);
  if (auth.error) return auth.error;
  const current = auth.tenant;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload JSON tidak valid.' }, 400);
  }

  const brandName = body?.brandName !== undefined
    ? String(body.brandName).trim().slice(0, 60)
    : current.brand_name;
  const tagline = body?.tagline !== undefined
    ? String(body.tagline).trim().slice(0, 80)
    : current.tagline;
  const iconUrl = body?.iconUrl !== undefined ? String(body.iconUrl).trim() : current.icon_url;
  const faviconUrl = body?.faviconUrl !== undefined ? String(body.faviconUrl).trim() : current.favicon_url;
  const themePreset = body?.themePreset !== undefined
    ? String(body.themePreset).trim().slice(0, 24)
    : current.theme_preset;
  const primaryColor = body?.primaryColor !== undefined
    ? normalizeHexColor(body.primaryColor, current.primary_color)
    : current.primary_color;
  const accentColor = body?.accentColor !== undefined
    ? normalizeHexColor(body.accentColor, current.accent_color)
    : current.accent_color;
  const lynkUrl = body?.lynkUrl !== undefined ? String(body.lynkUrl).trim() : current.lynk_url;
  const lynkMerchantKey = body?.lynkMerchantKey !== undefined && String(body.lynkMerchantKey).trim() !== ''
    ? String(body.lynkMerchantKey).trim()
    : current.lynk_merchant_key;

  if (!brandName) {
    return jsonResponse({ ok: false, error: 'Nama brand wajib diisi.' }, 400);
  }
  if (!isValidImageOrEmpty(iconUrl) || !isValidImageOrEmpty(faviconUrl)) {
    return jsonResponse({ ok: false, error: 'Icon/Favicon harus berupa URL gambar atau file gambar maksimal 64KB.' }, 400);
  }
  if (lynkUrl && !isValidHttpUrl(lynkUrl)) {
    return jsonResponse({ ok: false, error: 'Link Lynk.id harus berupa URL http/https yang valid.' }, 400);
  }

  await env.DB.prepare(
    `UPDATE tenants
     SET brand_name = ?, tagline = ?, icon_url = ?, favicon_url = ?,
         theme_preset = ?, primary_color = ?, accent_color = ?,
         lynk_url = ?, lynk_merchant_key = ?
     WHERE id = ?`
  )
    .bind(
      brandName,
      tagline,
      iconUrl,
      faviconUrl,
      themePreset,
      primaryColor,
      accentColor,
      lynkUrl,
      lynkMerchantKey,
      current.id
    )
    .run();

  const updated = await env.DB.prepare('SELECT * FROM tenants WHERE id = ? LIMIT 1')
    .bind(current.id)
    .first();

  return jsonResponse({
    ok: true,
    tenant: serializePartnerTenant(updated),
  });
}
