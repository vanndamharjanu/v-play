import { onRequestGet as handleConfig } from '../functions/api/config.js';
import { onRequestGet as handleCatalog } from '../functions/api/catalog.js';
import { onRequestPost as handleActivate } from '../functions/api/license/activate.js';
import { onRequestPost as handleRecover } from '../functions/api/license/recover.js';
import { onRequestPost as handleLynkWebhook } from '../functions/api/webhook/lynk.js';
import { jsonResponse } from '../functions/_lib/license.js';

const API_ROUTES = {
  '/api/config': { method: 'GET', handler: handleConfig },
  '/api/catalog': { method: 'GET', handler: handleCatalog },
  '/api/license/activate': { method: 'POST', handler: handleActivate },
  '/api/license/recover': { method: 'POST', handler: handleRecover },
  '/api/webhook/lynk': { method: 'POST', handler: handleLynkWebhook },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = API_ROUTES[url.pathname];

    if (route) {
      if (request.method !== route.method) {
        return jsonResponse({ ok: false, error: 'Metode tidak diizinkan.' }, 405);
      }
      return route.handler({ request, env, ctx });
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
