import { jsonResponse, sendLicenseEmail } from '../../_lib/license.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terhubung.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Permintaan tidak valid.' }, 400);
  }

  const email = String(body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@') || !email.includes('.')) {
    return jsonResponse({ ok: false, error: 'Masukkan alamat email yang valid.' }, 400);
  }

  const license = await env.DB.prepare(
    "SELECT code, customer_name, max_devices FROM licenses WHERE customer_email = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
  )
    .bind(email)
    .first();

  const emailConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  if (license?.code && emailConfigured) {
    const appUrl = env.APP_PUBLIC_URL || new URL(request.url).origin;
    try {
      await sendLicenseEmail({
        apiKey: env.RESEND_API_KEY,
        fromEmail: env.EMAIL_FROM,
        toEmail: email,
        name: license.customer_name,
        code: license.code,
        appUrl,
        maxDevices: license.max_devices,
      });
    } catch {
      // Keep neutral response without leaking account lookup status.
    }
  }

  return jsonResponse({
    ok: true,
    emailConfigured,
    message:
      'Jika email ini terdaftar pada pembelian aktif, kode lisensi sudah dikirim ulang ke inbox/spam Anda.',
  });
}
