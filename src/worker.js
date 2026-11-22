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
import { jsonResponse } from '../functions/_lib/license.js';

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
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
