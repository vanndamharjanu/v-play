import { jsonResponse } from '../_lib/license.js';

export async function onRequestGet(context) {
  const { env } = context;
  return jsonResponse({
    ok: true,
    lynkUrl: env.LYNK_PRODUCT_URL || '',
    hasEmailRecovery: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  });
}
