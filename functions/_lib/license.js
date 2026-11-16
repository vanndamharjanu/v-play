const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const encoder = new TextEncoder();

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(text)));
  return toHex(digest);
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(String(message)));
  return toHex(sig);
}

export function timingSafeEqualHex(a, b) {
  const s1 = String(a || '').trim().toLowerCase().replace(/^sha256=/, '');
  const s2 = String(b || '').trim().toLowerCase().replace(/^sha256=/, '');
  if (!s1 || s1.length !== s2.length) return false;
  let diff = 0;
  for (let i = 0; i < s1.length; i++) {
    diff |= s1.charCodeAt(i) ^ s2.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies Lynk.id x-lynk-signature using either raw-body HMAC-SHA256
 * or SHA256(grandTotal + refId + message_id + merchantKey).
 */
export async function verifyLynkSignature({ rawBody, payload, signatureHeader, merchantKey }) {
  const key = String(merchantKey || '').trim();
  if (!signatureHeader || !key) return false;

  const rawHmac = await hmacSha256Hex(key, rawBody);
  if (timingSafeEqualHex(rawHmac, signatureHeader)) return true;

  const data = payload?.data || {};
  const msgData = data?.message_data || {};
  const grandTotal =
    msgData?.totals?.grandTotal ??
    data?.totals?.grandTotal ??
    payload?.totals?.grandTotal ??
    payload?.grandTotal ??
    data?.amount ??
    payload?.amount ??
    '';
  const refId =
    msgData?.refId ??
    msgData?.ref_id ??
    data?.refId ??
    data?.ref_id ??
    data?.reference ??
    payload?.refId ??
    payload?.ref_id ??
    '';
  const messageId =
    data?.message_id ??
    msgData?.message_id ??
    payload?.message_id ??
    '';

  if (grandTotal !== '' && refId && messageId) {
    const legacyDigest = await sha256Hex(`${grandTotal}${refId}${messageId}${key}`);
    if (timingSafeEqualHex(legacyDigest, signatureHeader)) return true;
  }

  return false;
}

export function extractLynkOrder(payload) {
  const event = String(payload?.event || '').toLowerCase();
  const data = payload?.data || {};
  const msgData = data?.message_data || {};
  const customer = msgData?.customer || data?.customer || {};

  const status = String(data?.status || msgData?.status || '').toLowerCase();
  const paidEvents = new Set(['payment.received', 'payment.success', 'order.paid', 'transaction.paid']);
  const paidStatuses = new Set(['paid', 'success', 'completed', 'settled', 'settlement']);
  const isPaid =
    paidStatuses.has(status) ||
    paidEvents.has(event) ||
    (event.includes('payment') && !status);

  const items = Array.isArray(msgData?.items) ? msgData.items : [];
  const productName = String(
    data?.product?.name ||
      items[0]?.title ||
      items[0]?.name ||
      items[0]?.productName ||
      data?.product_name ||
      ''
  ).trim();

  const refId = String(
    msgData?.refId ||
      msgData?.ref_id ||
      data?.refId ||
      data?.ref_id ||
      data?.reference ||
      data?.message_id ||
      msgData?.message_id ||
      ''
  ).trim();

  const amountRaw =
    msgData?.totals?.grandTotal ?? data?.amount ?? data?.product?.price ?? 0;

  return {
    event: payload?.event || status || 'unknown',
    isPaid,
    refId,
    email: String(customer?.email || '').trim().toLowerCase(),
    name: String(customer?.name || '').trim(),
    phone: String(customer?.phone || '').trim(),
    productName,
    amount: Math.max(0, Math.round(Number(amountRaw) || 0)),
  };
}

export function generateLicenseCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `FP-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export function generateDeviceToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `fpt_${toHex(bytes)}`;
}

export function normalizeCode(input) {
  return String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

export function normalizeDeviceId(input) {
  const cleaned = String(input || '').trim();
  return cleaned.length >= 8 && cleaned.length <= 128 ? cleaned : '';
}

export function extractBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return '';
  return auth.slice(7).trim();
}

export function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendLicenseEmail({ apiKey, fromEmail, toEmail, name, code, appUrl, maxDevices = 3 }) {
  if (!apiKey || !fromEmail || !toEmail) {
    return { sent: false, skipped: true };
  }
  const displayName = String(name || '').trim() || 'Bapak/Ibu';
  const targetUrl = String(appUrl || 'https://funplay.web.id').trim() || 'https://funplay.web.id';
  const safeName = escapeHtml(displayName);
  const safeCode = escapeHtml(code);
  const safeUrl = escapeHtml(targetUrl);

  const text = [
    `Halo ${displayName},`,
    '',
    `Berikut kode akses FunPlay Anda (berlaku hingga ${maxDevices} perangkat):`,
    code,
    '',
    'Cara aktivasi:',
    `1. Buka ${targetUrl}`,
    '2. Ketuk tombol Buka Semua',
    '3. Masukkan kode akses di atas lalu pilih Aktifkan',
  ].join('\n');

  const html = `
    <div style="background:#F4F9F7;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1B282C;line-height:1.55">
      <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:2px solid #CFE8E5;border-top:6px solid #007C91;border-radius:18px;padding:26px 24px">
        <div style="margin-bottom:16px">
          <span style="display:inline-block;padding:4px 10px;border-radius:8px;background:#FDEBF2;color:#9E1949;font-size:12px;font-weight:700">Akses Penuh Sekali Bayar</span>
          <h2 style="margin:10px 0 4px;font-size:22px;line-height:1.25;color:#005B6B">Kode Akses FunPlay</h2>
          <p style="margin:0;font-size:13px;color:#475F66">Main &amp; Belajar Bahasa Inggris Anak 1-5 Tahun</p>
        </div>

        <p style="margin:16px 0 8px;font-size:15px">Halo <strong>${safeName}</strong>,</p>
        <p style="margin:0 0 18px;font-size:15px;color:#1B282C">
          Terima kasih! Akses penuh FunPlay untuk <strong>${maxDevices} perangkat</strong> keluarga Anda sudah siap dipakai.
        </p>

        <div style="margin:18px 0;padding:18px 16px;border-radius:14px;background:#EAF9FC;border:2px solid #34C5D9;text-align:center">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;color:#005B6B">KODE LISENSI ANDA</div>
          <div style="margin-top:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:22px;font-weight:800;letter-spacing:2px;color:#004754;user-select:all">${safeCode}</div>
        </div>

        <div style="margin:18px 0 20px;text-align:center">
          <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:12px;background:#86DC62;border:2px solid #59B338;border-bottom-width:4px;color:#1B282C;font-size:15px;font-weight:700;text-decoration:none">Buka FunPlay Sekarang</a>
        </div>

        <div style="padding:14px 16px;border-radius:12px;background:#F8FBF6;border:1px solid #DCEEEB;font-size:13px;color:#1B282C">
          <strong style="color:#005B6B">Cara mengaktifkan:</strong>
          <ol style="margin:8px 0 0;padding-left:18px">
            <li style="margin-bottom:4px">Salin kode lisensi di atas.</li>
            <li style="margin-bottom:4px">Buka FunPlay lewat tombol hijau di atas atau kunjungi <a href="${safeUrl}" style="color:#005B6B">${safeUrl}</a>.</li>
            <li>Ketuk <strong>Buka Semua</strong>, tempel kode, lalu tekan <strong>Aktifkan</strong>.</li>
          </ol>
        </div>

        <p style="margin:18px 0 0;font-size:12px;color:#52676D">
          Simpan email ini sebagai cadangan. Bila butuh bantuan, cukup balas email ini.
        </p>
      </div>
    </div>
  `.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `Kode Akses FunPlay - ${code}`,
      text,
      html,
    }),
  });
  return { sent: res.ok, status: res.status };
}
