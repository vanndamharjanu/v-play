import { jsonResponse } from '../_lib/license.js';
import { normalizeAffiliateCode } from '../_lib/affiliate.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  let lynkUrl = env.LYNK_PRODUCT_URL || '';
  let affiliateCode = '';

  const reqUrl = request ? new URL(request.url) : null;
  const ref = normalizeAffiliateCode(reqUrl?.searchParams.get('ref'));
  const shouldTrack = reqUrl?.searchParams.get('track') === '1';

  if (ref && env?.DB) {
    const affiliate = await env.DB.prepare(
      'SELECT code, lynk_url FROM affiliates WHERE code = ? AND active = 1 LIMIT 1'
    )
      .bind(ref)
      .first();

    if (affiliate?.lynk_url) {
      lynkUrl = affiliate.lynk_url;
      affiliateCode = affiliate.code;

      if (shouldTrack) {
        await env.DB.prepare('UPDATE affiliates SET clicks = clicks + 1 WHERE code = ?')
          .bind(affiliate.code)
          .run();
      }
    }
  }

  return jsonResponse({
    ok: true,
    lynkUrl,
    affiliateCode,
    hasEmailRecovery: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  });
}
