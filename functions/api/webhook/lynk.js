import {
  jsonResponse,
  verifyLynkSignature,
  extractLynkOrder,
  generateLicenseCode,
  sendLicenseEmail,
} from '../../_lib/license.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB || !env.LYNK_MERCHANT_KEY) {
    return jsonResponse({ ok: false, error: 'Server licensing belum terkonfigurasi.' }, 500);
  }

  const rawBody = await request.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, error: 'Payload JSON tidak valid.' }, 400);
  }

  const signature =
    request.headers.get('x-lynk-signature') ||
    request.headers.get('x-signature') ||
    request.headers.get('x-webhook-signature') ||
    request.headers.get('signature') ||
    '';
  const validSig = await verifyLynkSignature({
    rawBody,
    payload,
    signatureHeader: signature,
    merchantKey: env.LYNK_MERCHANT_KEY,
  });

  if (!validSig) {
    const diag = {
      headerNames: [...request.headers.keys()],
      hasSignatureHeader: Boolean(signature),
      signatureLength: signature.length,
      event: payload?.event || null,
      rawPreview: rawBody.slice(0, 1500),
    };
    console.warn('Webhook invalid signature', diag.headerNames, diag.hasSignatureHeader, diag.signatureLength);
    try {
      await env.DB.prepare(
        'INSERT INTO webhook_logs (event_name, ref_id, customer_email, payload_json) VALUES (?, ?, ?, ?)'
      )
        .bind('invalid_signature', null, null, JSON.stringify(diag))
        .run();
    } catch {
      // Do not mask 401 response if diagnostic logging fails.
    }
    return jsonResponse({ ok: false, error: 'Signature webhook tidak valid.' }, 401);
  }

  const order = extractLynkOrder(payload);

  await env.DB.prepare(
    'INSERT INTO webhook_logs (event_name, ref_id, customer_email, payload_json) VALUES (?, ?, ?, ?)'
  )
    .bind(order.event, order.refId || null, order.email || null, rawBody.slice(0, 16000))
    .run();

  if (!order.isPaid) {
    return jsonResponse({ ok: true, ignored: true, reason: 'not_paid' });
  }

  if (env.LYNK_PRODUCT_FILTER) {
    const filterNeedle = env.LYNK_PRODUCT_FILTER.trim().toLowerCase();
    if (filterNeedle && !order.productName.toLowerCase().includes(filterNeedle)) {
      return jsonResponse({ ok: true, ignored: true, reason: 'product_mismatch' });
    }
  }

  if (!order.email) {
    return jsonResponse({ ok: false, error: 'Email pembeli kosong di payload.' }, 400);
  }

  const maxDevices = Math.max(1, Number(env.MAX_DEVICES || 3));
  let code = '';
  let duplicate = false;

  if (order.refId) {
    const existing = await env.DB.prepare('SELECT code FROM licenses WHERE ref_id = ? LIMIT 1')
      .bind(order.refId)
      .first();
    if (existing?.code) {
      code = existing.code;
      duplicate = true;
    }
  }

  if (!code) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = generateLicenseCode();
      try {
        await env.DB.prepare(
          `INSERT INTO licenses (code, ref_id, customer_email, customer_name, customer_phone, product_name, amount, max_devices)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            candidate,
            order.refId || null,
            order.email,
            order.name,
            order.phone,
            order.productName,
            order.amount,
            maxDevices
          )
          .run();
        code = candidate;
        break;
      } catch (err) {
        if (attempt === 2) throw err;
      }
    }
  }

  const appUrl = env.APP_PUBLIC_URL || new URL(request.url).origin;
  let emailSent = false;
  if (!duplicate) {
    try {
      const mailRes = await sendLicenseEmail({
        apiKey: env.RESEND_API_KEY,
        fromEmail: env.EMAIL_FROM,
        toEmail: order.email,
        name: order.name,
        code,
        appUrl,
        maxDevices,
      });
      emailSent = Boolean(mailRes.sent);
    } catch {
      emailSent = false;
    }

    if (env.WHATSAPP_WEBHOOK_URL) {
      try {
        await fetch(env.WHATSAPP_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: order.phone,
            name: order.name,
            email: order.email,
            code,
            appUrl,
          }),
        });
      } catch {
        // Non-fatal: license is safely stored in D1 and recoverable via email.
      }
    }
  }

  return jsonResponse({
    ok: true,
    duplicate,
    refId: order.refId || null,
    emailSent,
  });
}
