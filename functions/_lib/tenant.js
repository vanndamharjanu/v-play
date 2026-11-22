import { escapeHtml } from './license.js';

export const THEME_PRESETS = [
  { id: 'teal', label: 'Teal Ceria', primary: '#007C91', accent: '#86DC62' },
  { id: 'berry', label: 'Berry Pink', primary: '#B83280', accent: '#38BDF8' },
  { id: 'sunny', label: 'Sunny Orange', primary: '#C2590A', accent: '#4ADE80' },
  { id: 'sky', label: 'Sky Blue', primary: '#1D63B8', accent: '#FBBF24' },
  { id: 'forest', label: 'Forest Mint', primary: '#1E7A55', accent: '#F472B0' },
];

export function normalizeHostname(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return '';
  const withoutProto = raw.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  return withoutProto.replace(/^www\./, '');
}

export function normalizeHexColor(input, fallback = '#007C91') {
  const val = String(input || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(val) ? val.toUpperCase() : fallback;
}

function hexToRgb(hex) {
  const clean = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mixHex(hexA, hexB, ratioB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratioB));
  const toByte = (v) => Math.round(v).toString(16).padStart(2, '0');
  const r = toByte(a.r * (1 - t) + b.r * t);
  const g = toByte(a.g * (1 - t) + b.g * t);
  const bl = toByte(a.b * (1 - t) + b.b * t);
  return `#${r}${g}${bl}`.toUpperCase();
}

export function buildThemeTokens(primaryHex, accentHex) {
  const primary = normalizeHexColor(primaryHex, '#007C91');
  const accent = normalizeHexColor(accentHex, '#86DC62');
  return {
    accent: primary,
    accentHover: mixHex(primary, '#000000', 0.14),
    accentLip: mixHex(primary, '#000000', 0.28),
    accentSoft: mixHex(primary, '#FFFFFF', 0.85),
    cyanInk: mixHex(primary, '#000000', 0.30),
    greenBright: accent,
    greenHover: mixHex(accent, '#000000', 0.12),
    greenLip: mixHex(accent, '#000000', 0.26),
    greenSoft: mixHex(accent, '#FFFFFF', 0.84),
  };
}

export function buildBrandSvgDataUrl(brandName, primaryHex = '#007C91', accentHex = '#86DC62') {
  const initial = (String(brandName || 'F').trim().charAt(0) || 'F').toUpperCase();
  const primary = normalizeHexColor(primaryHex, '#007C91');
  const accent = normalizeHexColor(accentHex, '#86DC62');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="${primary}"/><circle cx="24.5" cy="7.5" r="3.2" fill="${accent}"/><text x="16" y="21.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="800" fill="#FFFFFF">${escapeHtml(initial)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function generatePortalToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `fpb_${hex}`;
}

export function isTenantExpired(tenant, now = new Date()) {
  if (!tenant) return false;
  if (!tenant.active) return true;
  const exp = String(tenant.expires_at || '').trim();
  if (!exp) return false;
  const todayIso = now.toISOString().slice(0, 10);
  return exp < todayIso;
}

export async function resolveTenantByRequest(request, env) {
  if (!env?.DB || !request) return null;
  const urlHost = normalizeHostname(new URL(request.url).hostname);
  const headerHost = normalizeHostname(request.headers.get('host'));
  const hostname = headerHost || urlHost;
  if (!hostname) return null;

  try {
    const row = await env.DB.prepare('SELECT * FROM tenants WHERE hostname = ? LIMIT 1')
      .bind(hostname)
      .first();
    return row || null;
  } catch {
    return null;
  }
}

export function buildTenantThemeCss(tenant) {
  const tokens = buildThemeTokens(tenant.primary_color, tenant.accent_color);
  return `:root{--accent:${tokens.accent};--accent-hover:${tokens.accentHover};--accent-lip:${tokens.accentLip};--accent-soft:${tokens.accentSoft};--cyan-ink:${tokens.cyanInk};--green-bright:${tokens.greenBright};--green-hover:${tokens.greenHover};--green-lip:${tokens.greenLip};--green-soft:${tokens.greenSoft};}`;
}

export function applyTenantHtmlRewriter(response, tenant, requestUrl) {
  const origin = new URL(requestUrl).origin;
  const brandName = String(tenant.brand_name || 'FunPlay').trim();
  const tagline = String(tenant.tagline || 'Kosakata anak 1-5 tahun').trim();
  const primary = normalizeHexColor(tenant.primary_color, '#007C91');
  const accent = normalizeHexColor(tenant.accent_color, '#86DC62');
  const fallbackSvg = buildBrandSvgDataUrl(brandName, primary, accent);
  const iconSrc = String(tenant.icon_url || '').trim() || fallbackSvg;
  const faviconSrc = String(tenant.favicon_url || '').trim() || iconSrc;
  const pageTitle = `${brandName} | Main & Belajar Bahasa Inggris Anak 1-5 Tahun`;
  const themeCss = buildTenantThemeCss(tenant);

  if (typeof HTMLRewriter !== 'undefined') {
    const brandMarkHtml = `<img src="${escapeHtml(iconSrc)}" alt="" width="32" height="32" style="width:32px;height:32px;border-radius:10px;object-fit:cover;display:block;" />`;

    return new HTMLRewriter()
      .on('title', {
        element(el) {
          el.setInnerContent(pageTitle);
        },
      })
      .on('meta[name="theme-color"]', {
        element(el) {
          el.setAttribute('content', primary);
        },
      })
      .on('meta[property="og:site_name"]', {
        element(el) {
          el.setAttribute('content', brandName);
        },
      })
      .on('meta[property="og:title"]', {
        element(el) {
          el.setAttribute('content', pageTitle);
        },
      })
      .on('meta[name="twitter:title"]', {
        element(el) {
          el.setAttribute('content', pageTitle);
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute('content', `${origin}/`);
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute('href', `${origin}/`);
        },
      })
      .on('link[rel="icon"]', {
        element(el) {
          el.setAttribute('href', faviconSrc);
          el.removeAttribute('type');
        },
      })
      .on('link[rel="apple-touch-icon"]', {
        element(el) {
          el.setAttribute('href', iconSrc);
        },
      })
      .on('.brand-name', {
        element(el) {
          el.setInnerContent(brandName);
        },
      })
      .on('.brand-sub', {
        element(el) {
          el.setInnerContent(tagline);
        },
      })
      .on('.brand-mark', {
        element(el) {
          el.setInnerContent(brandMarkHtml, { html: true });
        },
      })
      .on('head', {
        element(el) {
          el.append(`<style id="tenant-theme">${themeCss}</style>`, { html: true });
        },
      })
      .transform(response);
  }

  // Fallback for Node test runtime when HTMLRewriter is not globally defined
  return response;
}

export function renderExpiredTenantResponse(tenant) {
  const brand = escapeHtml(tenant?.brand_name || 'Layanan');
  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${brand} — Langganan Tidak Aktif</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f4f9f7;color:#1b282c;}
    .box{max-width:460px;background:#fff;border:2px solid #cfe8e5;border-radius:18px;padding:28px 24px;text-align:center;}
    h1{margin:0 0 8px;font-size:22px;color:#005b6b;}
    p{margin:0;font-size:15px;color:#52676d;line-height:1.55;}
  </style>
</head>
<body>
  <div class="box">
    <h1>${brand} Sedang Tidak Aktif</h1>
    <p>Masa aktif langganan platform untuk domain ini telah berakhir atau dinonaktifkan sementara. Silakan hubungi pengelola brand Anda.</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
