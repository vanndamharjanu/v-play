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
  const s1 = String(a || '').trim().toLowerCase();
  const s2 = String(b || '').trim().toLowerCase();
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
  if (!signatureHeader || !merchantKey) return false;

  const rawHmac = await hmacSha256Hex(merchantKey, rawBody);
  if (timingSafeEqualHex(rawHmac, signatureHeader)) return true;

  const data = payload?.data || {};
  const grandTotal =
    data?.message_data?.totals?.grandTotal ?? data?.totals?.grandTotal ?? '';
  const refId = data?.message_data?.refId ?? data?.refId ?? data?.reference ?? '';
  const messageId = data?.message_id ?? payload?.message_id ?? '';

  if (grandTotal !== '' && refId && messageId) {
    const legacyDigest = await sha256Hex(`${grandTotal}${refId}${messageId}${merchantKey}`);
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
    data?.product?.name || items[0]?.title || items[0]?.name || data?.product_name || ''
  ).trim();

  const refId = String(
    msgData?.refId || data?.refId || data?.reference || data?.message_id || ''
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
  const safeName = escapeHtml(name || 'Orang Tua Hebat');
  const safeCode = escapeHtml(code);
  const safeUrl = escapeHtml(appUrl || 'https://funplay.workers.dev');

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1B282C;line-height:1.5">
      <h2 style="color:#007C91">Kode Akses Penuh FunPlay</h2>
      <p>Halo ${safeName}, terima kasih sudah mendukung belajar bahasa Inggris bersama <strong>FunPlay</strong>!</p>
      <p>Gunakan kode akses sekali bayar di bawah ini (berlaku hingga <strong>${maxDevices} perangkat</strong> keluarga):</p>
      <div style="margin:16px 0;padding:16px;border-radius:14px;background:#D9F6FA;border:2px solid #34C5D9;text-align:center;font-size:22px;font-weight:700;letter-spacing:2px;color:#005B6B">
        ${safeCode}
      </div>
      <p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#86DC62;color:#1B282C;font-weight:700;text-decoration:none">Buka FunPlay &amp; Aktifkan Sekarang</a></p>
      <p style="font-size:13px;color:#52676D">Buka link di atas, ketuk tombol <strong>Buka Semua</strong>, lalu tempel kode ini.</p>
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
      subject: `Kode Akses FunPlay Anda: ${code}`,
      html,
    }),
  });
  return { sent: res.ok, status: res.status };
}
