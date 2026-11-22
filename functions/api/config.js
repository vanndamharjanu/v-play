import { jsonResponse } from '../_lib/license.js';
import { normalizeAffiliateCode } from '../_lib/affiliate.js';
import { isTenantExpired, resolveTenantByRequest } from '../_lib/tenant.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const tenant = await resolveTenantByRequest(request, env);

  if (tenant && isTenantExpired(tenant)) {
    return jsonResponse({ ok: false, error: 'Langganan brand ini sedang tidak aktif.' }, 403);
  }

  let lynkUrl = tenant ? (tenant.lynk_url || '') : (env.LYNK_PRODUCT_URL || '');
  let affiliateCode = '';

  const reqUrl = request ? new URL(request.url) : null;
  const ref = normalizeAffiliateCode(reqUrl?.searchParams.get('ref'));
  const shouldTrack = reqUrl?.searchParams.get('track') === '1';

  if (!tenant && ref && env?.DB) {
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

  const fromEmail = tenant ? (tenant.email_from || env.EMAIL_FROM) : env.EMAIL_FROM;

  return jsonResponse({
    ok: true,
    lynkUrl,
    affiliateCode,
    brandName: tenant ? tenant.brand_name : 'FunPlay',
    isWhiteLabel: Boolean(tenant),
    hasEmailRecovery: Boolean(env.RESEND_API_KEY && fromEmail),
  });
}
