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
const migrationSql = fs.readFileSync(path.join(rootDir, 'migrations/0001_licenses.sql'), 'utf8');

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
    assert.equal(actJson.catalog.length, 139);
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

  // /api/catalog returns 139 words with valid bearer token and rejects unauthenticated requests
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
  assert.equal(catJson.catalog.length, 139);
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

test('sendLicenseEmail builds clean transactional text and html payload without promo buttons', async () => {
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
    assert.ok(!captured.body.html.includes('#86DC62'));
  } finally {
    globalThis.fetch = prevFetch;
  }
});
