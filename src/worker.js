import { onRequestGet as handleConfig } from '../functions/api/config.js';
import { onRequestGet as handleCatalog } from '../functions/api/catalog.js';
import { onRequestPost as handleActivate } from '../functions/api/license/activate.js';
import { onRequestPost as handleRecover } from '../functions/api/license/recover.js';
import { onRequestPost as handleLynkWebhook } from '../functions/api/webhook/lynk.js';
import { onRequestPost as handleAffiliateClick } from '../functions/api/affiliate/click.js';
import {
  onRequestGet as handleAdminAffiliatesGet,
  onRequestPost as handleAdminAffiliatesPost,
  onRequestPatch as handleAdminAffiliatesPatch,
  onRequestDelete as handleAdminAffiliatesDelete,
} from '../functions/api/admin/affiliates.js';
import {
  onRequestGet as handleAdminTenantsGet,
  onRequestPost as handleAdminTenantsPost,
  onRequestPatch as handleAdminTenantsPatch,
  onRequestDelete as handleAdminTenantsDelete,
} from '../functions/api/admin/tenants.js';
import {
  onRequestGet as handleBrandSetupGet,
  onRequestPut as handleBrandSetupPut,
} from '../functions/api/brand/setup.js';
import { jsonResponse } from '../functions/_lib/license.js';
import {
  applyTenantHtmlRewriter,
  isTenantExpired,
  renderExpiredTenantResponse,
  resolveTenantByRequest,
} from '../functions/_lib/tenant.js';

const API_ROUTES = {
  '/api/config': { GET: handleConfig },
  '/api/catalog': { GET: handleCatalog },
  '/api/license/activate': { POST: handleActivate },
  '/api/license/recover': { POST: handleRecover },
  '/api/webhook/lynk': { POST: handleLynkWebhook },
  '/api/affiliate/click': { POST: handleAffiliateClick },
  '/api/admin/affiliates': {
    GET: handleAdminAffiliatesGet,
    POST: handleAdminAffiliatesPost,
    PATCH: handleAdminAffiliatesPatch,
    DELETE: handleAdminAffiliatesDelete,
  },
  '/api/admin/tenants': {
    GET: handleAdminTenantsGet,
    POST: handleAdminTenantsPost,
    PATCH: handleAdminTenantsPatch,
    DELETE: handleAdminTenantsDelete,
  },
  '/api/brand/setup': {
    GET: handleBrandSetupGet,
    PUT: handleBrandSetupPut,
  },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const handlers = API_ROUTES[url.pathname];

    if (handlers) {
      const handler = handlers[request.method];
      if (!handler) {
        return jsonResponse({ ok: false, error: 'Metode tidak diizinkan.' }, 405);
      }
      return handler({ request, env, ctx });
    }

    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({ ok: false, error: 'Endpoint tidak ditemukan.' }, 404);
    }

    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if ((url.pathname === '/' || url.pathname === '/index.html') && assetRes.ok) {
        const tenant = await resolveTenantByRequest(request, env);
        if (tenant) {
          if (isTenantExpired(tenant)) {
            return renderExpiredTenantResponse(tenant);
          }
          return applyTenantHtmlRewriter(assetRes, tenant, request.url);
        }
      }
      return assetRes;
    }

    return new Response('Not found', { status: 404 });
  },
};
