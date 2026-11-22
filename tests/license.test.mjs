import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hmacSha256Hex, sha256Hex, sendLicenseEmail } from '../functions/_lib/license.js';
import { onRequestPost as webhookHandler } from '../functions/api/webhook/lynk.js';
import { onRequestPost as activateHandler } from '../functions/api/license/activate.js';
import { onRequestGet as catalogHandler } from '../functions/api/catalog.js';
import { onRequestPost as recoverHandler } from '../functions/api/license/recover.js';
import { onRequestGet as configHandler } from '../functions/api/config.js';
import { onRequest as middlewareHandler } from '../functions/_middleware.js';
import worker from '../src/worker.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const migrationSql = [
  fs.readFileSync(path.join(rootDir, 'migrations/0001_licenses.sql'), 'utf8'),
  fs.readFileSync(path.join(rootDir, 'migrations/0002_affiliates.sql'), 'utf8'),
  fs.readFileSync(path.join(rootDir, 'migrations/0003_tenants.sql'), 'utf8'),
].join('\n');

function createMockD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migrationSql);

  return {
    sqlite,
    prepare(sql) {
      let params = [];
      const stmt = sqlite.prepare(sql);
      return {
        bind(...args) {
          params = args;
          return this;
        },
        async first() {
          return stmt.get(...params) ?? null;
        },
        async all() {
          return { results: stmt.all(...params) };
        },
        async run() {
          const info = stmt.run(...params);
          return { success: true, meta: info };
        },
      };
    },
  };
}

test('webhook verifies signature, generates idempotent license code, activates up to 3 devices, and serves catalog', async () => {
  const DB = createMockD1();
  const env = {
    DB,
    LYNK_MERCHANT_KEY: 'test_merchant_secret_123',
    LYNK_PRODUCT_URL: 'https://lynk.id/funplay/produk-demo',
    MAX_DEVICES: '3',
  };

  // Config endpoint exposes Lynk URL
  const cfgRes = await configHandler({ env });
  assert.equal(cfgRes.status, 200);
  const cfgData = await cfgRes.json();
  assert.equal(cfgData.lynkUrl, 'https://lynk.id/funplay/produk-demo');

  // Middleware hides migrations/tests/wrangler while allowing /api/*
  const blockedRes = await middlewareHandler({
    request: new Request('https://funplay.workers.dev/migrations/0001_licenses.sql'),
    next: () => new Response('should not reach'),
  });
  assert.equal(blockedRes.status, 404);

  const payloadObj = {
    event: 'payment.received',
    data: {
      message_id: 'msg_001',
      message_data: {
        refId: 'LYNK-REF-1001',
        customer: {
          name: 'Budi',
          email: 'Budi@Example.com',
          phone: '+628123456789',
        },
        items: [{ title: 'FunPlay Full Access' }],
        totals: { grandTotal: 49000 },
      },
    },
  };
  const rawBody = JSON.stringify(payloadObj);

  // Invalid signature rejected with 401 and logged cleanly for diagnostics
  const badRes = await webhookHandler({
    request: new Request('https://funplay.workers.dev/api/webhook/lynk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-lynk-signature': 'deadbeef' },
      body: rawBody,
    }),
    env,
  });
  assert.equal(badRes.status, 401);
  const badLog = DB.sqlite
    .prepare("SELECT event_name, payload_json FROM webhook_logs WHERE event_name = 'invalid_signature' LIMIT 1")
    .get();
  assert.ok(badLog && JSON.parse(badLog.payload_json).hasSignatureHeader === true);

  // Valid HMAC-SHA256 raw body signature creates license
  const validSig = await hmacSha256Hex(env.LYNK_MERCHANT_KEY, rawBody);
  const okRes = await webhookHandler({
    request: new Request('https://funplay.workers.dev/api/webhook/lynk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-lynk-signature': validSig },
      body: rawBody,
    }),
    env,
  });
  assert.equal(okRes.status, 200);
  const okJson = await okRes.json();
  assert.equal(okJson.duplicate, false);

  const row = DB.sqlite.prepare('SELECT * FROM licenses WHERE ref_id = ?').get('LYNK-REF-1001');
  assert.ok(row && row.code.startsWith('FP-'));
  assert.equal(row.customer_email, 'budi@example.com');

  // Duplicate webhook with legacy SHA256(grandTotal + refId + message_id + merchantKey) stays idempotent
  const legacySig = await sha256Hex(`49000LYNK-REF-1001msg_001${env.LYNK_MERCHANT_KEY}`);
  const dupRes = await webhookHandler({
    request: new Request('https://funplay.workers.dev/api/webhook/lynk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-lynk-signature': legacySig },
      body: rawBody,
    }),
    env,
  });
  assert.equal(dupRes.status, 200);
  const dupJson = await dupRes.json();
  assert.equal(dupJson.duplicate, true);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS c FROM licenses').get().c, 1);

  // Activate 3 devices successfully + re-activating device-1 does not take a new slot
  let tokenDev1 = '';
  for (const devId of ['device-1-abc', 'device-1-abc', 'device-2-def', 'device-3-ghi']) {
    const actRes = await activateHandler({
      request: new Request('https://funplay.workers.dev/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: row.code.toLowerCase(), deviceId: devId }),
      }),
      env,
    });
    assert.equal(actRes.status, 200);
    const actJson = await actRes.json();
    assert.equal(actJson.ok, true);
    assert.equal(actJson.catalog.length, 201);
    if (devId === 'device-1-abc') tokenDev1 = actJson.token;
  }

  // 4th unique device is blocked with 403
  const dev4Res = await activateHandler({
    request: new Request('https://funplay.workers.dev/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: row.code, deviceId: 'device-4-jkl' }),
    }),
    env,
  });
  assert.equal(dev4Res.status, 403);

  // /api/catalog returns 201 words with valid bearer token and rejects unauthenticated requests
  const catBad = await catalogHandler({
    request: new Request('https://funplay.workers.dev/api/catalog'),
    env,
  });
  assert.equal(catBad.status, 401);

  const catOk = await catalogHandler({
    request: new Request('https://funplay.workers.dev/api/catalog', {
      headers: { Authorization: `Bearer ${tokenDev1}` },
    }),
    env,
  });
  assert.equal(catOk.status, 200);
  const catJson = await catOk.json();
  assert.equal(catJson.catalog.length, 201);
  assert.equal(catJson.usedDevices, 3);

  // Recover endpoint returns identical neutral 200 and never leaks the code in JSON
  const recRes = await recoverHandler({
    request: new Request('https://funplay.workers.dev/api/license/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'budi@example.com' }),
    }),
    env,
  });
  assert.equal(recRes.status, 200);
  const recText = await recRes.text();
  assert.ok(!recText.includes(row.code), 'Recover must never expose license code in HTTP response');

  // Revoking license immediately blocks /api/catalog
  DB.sqlite.prepare("UPDATE licenses SET status = 'revoked' WHERE id = ?").run(row.id);
  const revokedCat = await catalogHandler({
    request: new Request('https://funplay.workers.dev/api/catalog', {
      headers: { Authorization: `Bearer ${tokenDev1}` },
    }),
    env,
  });
  assert.equal(revokedCat.status, 401);
});

test('worker entrypoint routes API endpoints, rejects unknown methods/paths, and delegates non-API requests to ASSETS', async () => {
  const DB = createMockD1();
  const assetCalls = [];
  const env = {
    DB,
    LYNK_PRODUCT_URL: 'https://lynk.id/funplay/test',
    ASSETS: {
      async fetch(req) {
        assetCalls.push(new URL(req.url).pathname);
        return new Response('asset-ok', { status: 200 });
      },
    },
  };

  const cfgRes = await worker.fetch(new Request('https://funplay.workers.dev/api/config'), env, {});
  assert.equal(cfgRes.status, 200);
  const cfgData = await cfgRes.json();
  assert.equal(cfgData.lynkUrl, 'https://lynk.id/funplay/test');

  const methodErr = await worker.fetch(
    new Request('https://funplay.workers.dev/api/config', { method: 'POST' }),
    env,
    {}
  );
  assert.equal(methodErr.status, 405);

  const notFoundApi = await worker.fetch(new Request('https://funplay.workers.dev/api/unknown'), env, {});
  assert.equal(notFoundApi.status, 404);

  const assetRes = await worker.fetch(new Request('https://funplay.workers.dev/index.html'), env, {});
  assert.equal(assetRes.status, 200);
  assert.equal(await assetRes.text(), 'asset-ok');
  assert.deepEqual(assetCalls, ['/index.html']);
});

test('webhook accepts nested message_data.message_id, sha256= prefix, and trimmed merchant key', async () => {
  const DB = createMockD1();
  const key = 'test_merchant_secret_123';
  const payload = JSON.stringify({
    event: 'payment.received',
    data: {
      message_data: {
        message_id: 'msg_nested_1',
        refId: 'LYNK-REF-NESTED',
        totals: { grandTotal: 49000 },
        customer: { name: 'Sari', email: 'sari@example.com' },
      },
    },
  });
  const sig = await sha256Hex(`49000LYNK-REF-NESTEDmsg_nested_1${key}`);
  const res = await worker.fetch(
    new Request('https://funplay.workers.dev/api/webhook/lynk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': `sha256=${sig}` },
      body: payload,
    }),
    { DB, LYNK_MERCHANT_KEY: `  ${key}\n` },
    {}
  );
  assert.equal(res.status, 200);
  const row = DB.sqlite.prepare('SELECT code FROM licenses WHERE ref_id = ?').get('LYNK-REF-NESTED');
  assert.ok(row && row.code.startsWith('FP-'));
});

test('webhook acknowledges unsigned Lynk test_event ping safely without creating any license', async () => {
  const DB = createMockD1();
  const env = { DB, LYNK_MERCHANT_KEY: 'test_merchant_secret_123' };

  const testPing = await worker.fetch(
    new Request('https://funplay.workers.dev/api/webhook/lynk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'test_event',
        data: { message: 'This is a test webhook', timestamp: 1794813632604 },
      }),
    }),
    env,
    {}
  );
  assert.equal(testPing.status, 200);
  const testJson = await testPing.json();
  assert.equal(testJson.ok, true);
  assert.equal(testJson.test, true);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS c FROM licenses').get().c, 0);

  // Unsigned payment events are still strictly blocked with 401
  const unsignedPay = await worker.fetch(
    new Request('https://funplay.workers.dev/api/webhook/lynk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'payment.received',
        data: { message_data: { refId: 'FAKE', customer: { email: 'hacker@example.com' } } },
      }),
    }),
    env,
    {}
  );
  assert.equal(unsignedPay.status, 401);
});

test('sendLicenseEmail builds branded card html and plain text payload', async () => {
  const prevFetch = globalThis.fetch;
  let captured = null;
  globalThis.fetch = async (url, init) => {
    captured = { url, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ id: 'email_1' }), { status: 200 });
  };
  try {
    const res = await sendLicenseEmail({
      apiKey: 're_test',
      fromEmail: 'FunPlay <halo@funplay.web.id>',
      toEmail: 'budi@example.com',
      name: 'Budi',
      code: 'FP-ABCD-1234-EFGH',
      appUrl: 'https://funplay.web.id/',
      maxDevices: 3,
    });
    assert.equal(res.sent, true);
    assert.equal(captured.url, 'https://api.resend.com/emails');
    assert.ok(captured.body.text.includes('FP-ABCD-1234-EFGH'));
    assert.ok(captured.body.html.includes('FP-ABCD-1234-EFGH'));
    assert.ok(captured.body.html.includes('#86DC62') && captured.body.html.includes('#EAF9FC'));
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('affiliate admin CRUD, ref config override, and click tracking work via worker', async () => {
  const DB = createMockD1();
  const env = {
    DB,
    LYNK_PRODUCT_URL: 'https://lynk.id/funplay/default',
    ADMIN_SECRET: 'super_secret_admin_123',
  };

  // Unauthorized admin request rejected
  const unauthRes = await worker.fetch(
    new Request('https://funplay.web.id/api/admin/affiliates'),
    env,
    {}
  );
  assert.equal(unauthRes.status, 401);

  // Create affiliate with auto-generated code
  const createRes = await worker.fetch(
    new Request('https://funplay.web.id/api/admin/affiliates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer super_secret_admin_123',
      },
      body: JSON.stringify({
        name: 'Mama Ani',
        lynkUrl: 'https://lynk.id/funplay/aff-ani',
      }),
    }),
    env,
    {}
  );
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.ok, true);
  assert.ok(created.affiliate.code.startsWith('MAMA-'));

  const refCode = created.affiliate.code;

  // Config with ?ref=...&track=1 returns affiliate lynkUrl and increments clicks
  const cfgAffRes = await worker.fetch(
    new Request(`https://funplay.web.id/api/config?ref=${encodeURIComponent(refCode.toLowerCase())}&track=1`),
    env,
    {}
  );
  assert.equal(cfgAffRes.status, 200);
  const cfgAff = await cfgAffRes.json();
  assert.equal(cfgAff.lynkUrl, 'https://lynk.id/funplay/aff-ani');
  assert.equal(cfgAff.affiliateCode, refCode);

  // Checkout click tracking increments checkout_clicks
  const clickRes = await worker.fetch(
    new Request('https://funplay.web.id/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: refCode }),
    }),
    env,
    {}
  );
  assert.equal(clickRes.status, 200);
  const clickData = await clickRes.json();
  assert.equal(clickData.tracked, true);

  // List shows clicks=1 and checkoutClicks=1
  const listRes = await worker.fetch(
    new Request('https://funplay.web.id/api/admin/affiliates', {
      headers: { Authorization: 'Bearer super_secret_admin_123' },
    }),
    env,
    {}
  );
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.affiliates.length, 1);
  assert.equal(listData.affiliates[0].clicks, 1);
  assert.equal(listData.affiliates[0].checkoutClicks, 1);

  // Deactivate affiliate -> /api/config falls back to default LYNK_PRODUCT_URL
  const patchRes = await worker.fetch(
    new Request('https://funplay.web.id/api/admin/affiliates', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer super_secret_admin_123',
      },
      body: JSON.stringify({ code: refCode, active: false }),
    }),
    env,
    {}
  );
  assert.equal(patchRes.status, 200);

  const fallbackRes = await worker.fetch(
    new Request(`https://funplay.web.id/api/config?ref=${encodeURIComponent(refCode)}`),
    env,
    {}
  );
  const fallbackData = await fallbackRes.json();
  assert.equal(fallbackData.lynkUrl, 'https://lynk.id/funplay/default');
  assert.equal(fallbackData.affiliateCode, '');

  // Delete affiliate
  const delRes = await worker.fetch(
    new Request('https://funplay.web.id/api/admin/affiliates', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer super_secret_admin_123',
      },
      body: JSON.stringify({ code: refCode }),
    }),
    env,
    {}
  );
  assert.equal(delRes.status, 200);
});

test('white-label multi-tenant setup, license isolation, and expiry enforcement work via worker', async () => {
  const DB = createMockD1();
  const env = {
    DB,
    LYNK_MERCHANT_KEY: 'main_merchant_key',
    LYNK_PRODUCT_URL: 'https://lynk.id/funplay/main',
    ADMIN_SECRET: 'super_secret_admin_123',
    ASSETS: {
      async fetch() {
        return new Response('<html><head><title>FunPlay</title></head><body><span class="brand-name">FunPlay</span></body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      },
    },
  };

  // Admin creates white-label tenant
  const createTenantRes = await worker.fetch(
    new Request('https://funplay.web.id/api/admin/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer super_secret_admin_123',
      },
      body: JSON.stringify({
        hostname: 'www.belajarkids.id',
        brandName: 'BelajarKids',
        emailFrom: 'BelajarKids <halo@belajarkids.id>',
        expiresAt: '2099-12-31',
      }),
    }),
    env,
    {}
  );
  assert.equal(createTenantRes.status, 201);
  const createdTenant = await createTenantRes.json();
  assert.equal(createdTenant.tenant.hostname, 'belajarkids.id');
  const portalToken = createdTenant.tenant.portalToken;
  assert.ok(portalToken.startsWith('fpb_'));

  // Partner updates brand via portal token
  const updateBrandRes = await worker.fetch(
    new Request('https://belajarkids.id/api/brand/setup', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${portalToken}`,
      },
      body: JSON.stringify({
        brandName: 'BelajarKids ID',
        tagline: 'Belajar ceria setiap hari',
        themePreset: 'berry',
        primaryColor: '#B83280',
        accentColor: '#38BDF8',
        lynkUrl: 'https://lynk.id/belajarkids/full',
        lynkMerchantKey: 'partner_merchant_secret',
      }),
    }),
    env,
    {}
  );
  assert.equal(updateBrandRes.status, 200);
  const updatedBrand = await updateBrandRes.json();
  assert.equal(updatedBrand.tenant.brandName, 'BelajarKids ID');
  assert.equal(updatedBrand.tenant.hasMerchantKey, true);

  // Config on partner domain returns partner lynkUrl and brandName
  const partnerCfgRes = await worker.fetch(
    new Request('https://belajarkids.id/api/config'),
    env,
    {}
  );
  assert.equal(partnerCfgRes.status, 200);
  const partnerCfg = await partnerCfgRes.json();
  assert.equal(partnerCfg.lynkUrl, 'https://lynk.id/belajarkids/full');
  assert.equal(partnerCfg.brandName, 'BelajarKids ID');
  assert.equal(partnerCfg.isWhiteLabel, true);

  // Partner webhook uses partner merchant key and binds license to tenant_id
  const payloadObj = {
    event: 'payment.received',
    data: {
      message_id: 'msg_partner_1',
      message_data: {
        refId: 'BK-REF-001',
        customer: { name: 'Siti', email: 'siti@example.com', phone: '08123' },
        items: [{ title: 'BelajarKids Full' }],
        totals: { grandTotal: 49000 },
      },
    },
  };
  const rawBody = JSON.stringify(payloadObj);
  const partnerSig = await hmacSha256Hex('partner_merchant_secret', rawBody);

  const partnerHookRes = await worker.fetch(
    new Request('https://belajarkids.id/api/webhook/lynk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-lynk-signature': partnerSig },
      body: rawBody,
    }),
    env,
    {}
  );
  assert.equal(partnerHookRes.status, 200);

  const licRow = DB.sqlite
    .prepare("SELECT code, tenant_id FROM licenses WHERE ref_id = 'BK-REF-001'")
    .get();
  assert.ok(licRow && licRow.tenant_id === createdTenant.tenant.id);

  // Partner license cannot activate on main FunPlay domain
  const crossActRes = await worker.fetch(
    new Request('https://funplay.web.id/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: licRow.code, deviceId: 'device_12345678' }),
    }),
    env,
    {}
  );
  assert.equal(crossActRes.status, 404);

  // Partner license activates cleanly on partner domain
  const okActRes = await worker.fetch(
    new Request('https://belajarkids.id/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: licRow.code, deviceId: 'device_12345678' }),
    }),
    env,
    {}
  );
  assert.equal(okActRes.status, 200);

  // Expiring tenant blocks both HTML and API
  const expireRes = await worker.fetch(
    new Request('https://funplay.web.id/api/admin/tenants', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer super_secret_admin_123',
      },
      body: JSON.stringify({ hostname: 'belajarkids.id', expiresAt: '2020-01-01' }),
    }),
    env,
    {}
  );
  assert.equal(expireRes.status, 200);

  const blockedHtmlRes = await worker.fetch(new Request('https://belajarkids.id/'), env, {});
  assert.equal(blockedHtmlRes.status, 403);

  const blockedCfgRes = await worker.fetch(new Request('https://belajarkids.id/api/config'), env, {});
  assert.equal(blockedCfgRes.status, 403);
});
