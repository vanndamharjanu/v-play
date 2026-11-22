import { jsonResponse, sendLicenseEmail } from '../../_lib/license.js';
import { isTenantExpired, resolveTenantByRequest } from '../../_lib/tenant.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse({ ok: false, error: 'Database belum terhubung.' }, 500);
  }

  const tenant = await resolveTenantByRequest(request, env);
  if (tenant && isTenantExpired(tenant)) {
    return jsonResponse({ ok: false, error: 'Langganan brand ini sedang tidak aktif.' }, 403);
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

  const license = tenant
    ? await env.DB.prepare(
        "SELECT code, customer_name, max_devices FROM licenses WHERE customer_email = ? AND tenant_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
      )
        .bind(email, tenant.id)
        .first()
    : await env.DB.prepare(
        "SELECT code, customer_name, max_devices FROM licenses WHERE customer_email = ? AND tenant_id IS NULL AND status = 'active' ORDER BY id DESC LIMIT 1"
      )
        .bind(email)
        .first();

  const fromEmail = tenant ? (tenant.email_from || env.EMAIL_FROM) : env.EMAIL_FROM;
  const emailConfigured = Boolean(env.RESEND_API_KEY && fromEmail);
  if (license?.code && emailConfigured) {
    const appUrl = tenant ? new URL(request.url).origin : (env.APP_PUBLIC_URL || new URL(request.url).origin);
    try {
      await sendLicenseEmail({
        apiKey: env.RESEND_API_KEY,
        fromEmail,
        toEmail: email,
        name: license.customer_name,
        code: license.code,
        appUrl,
        maxDevices: license.max_devices,
        brandName: tenant ? tenant.brand_name : 'FunPlay',
        primaryColor: tenant ? tenant.primary_color : '#007C91',
      });
    } catch {
      // Keep neutral response without leaking account lookup status.
    }
  }

  return jsonResponse({
    ok: true,
    emailConfigured,
    message:
      'Jika email ini terdaftar pada pembelian aktif, kode lisensi sudah dikirim ulang. Cek Inbox, tab Promosi, atau Spam Anda.',
  });
}
