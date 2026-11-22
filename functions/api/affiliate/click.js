import { jsonResponse } from '../../_lib/license.js';
import { normalizeAffiliateCode } from '../../_lib/affiliate.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env?.DB) {
    return jsonResponse({ ok: true, tracked: false });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload tidak valid.' }, 400);
  }

  const code = normalizeAffiliateCode(body?.code);
  if (!code) {
    return jsonResponse({ ok: false, error: 'Kode affiliate kosong.' }, 400);
  }

  const res = await env.DB.prepare(
    'UPDATE affiliates SET checkout_clicks = checkout_clicks + 1 WHERE code = ? AND active = 1'
  )
    .bind(code)
    .run();

  return jsonResponse({
    ok: true,
    tracked: Boolean(res?.meta?.changes > 0),
  });
}
