// Contract tests for api/intake.js. Supabase and Resend are stubbed, so these
// run with no credentials and no network:  node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HANDLER = new URL('../api/intake.js', import.meta.url).pathname;

function mockRes() {
  const r = { code: 0, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}

function loadHandler(env = {}) {
  const base = {
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    RESEND_API_KEY: 'resend-key',
    INTERNAL_NOTIFICATION_EMAILS: 'claire@example.com, ops@example.com',
  };
  for (const k of Object.keys(base)) delete process.env[k];
  Object.assign(process.env, { ...base, ...env });
  for (const k of Object.keys(env)) if (env[k] === undefined) delete process.env[k];
  delete require.cache[require.resolve(HANDLER)];
  return require(HANDLER);
}

function stubFetch(calls, { fail = false } = {}) {
  globalThis.fetch = async (url, opt) => {
    const u = String(url);
    calls.push({ url: u, method: opt?.method || 'GET', body: opt?.body ? JSON.parse(opt.body) : null });
    if (fail) return new Response(JSON.stringify({ message: 'internal detail' }), { status: 500 });
    if (u.includes('/clients?email=')) return new Response('[]', { status: 200 });
    if (u.includes('/rest/v1/clients')) return new Response(JSON.stringify([{ id: 'client-1' }]), { status: 200 });
    if (u.includes('/inquiries')) return new Response(JSON.stringify([{ id: 'inquiry-1' }]), { status: 201 });
    return new Response('{}', { status: 200 });
  };
}

const valid = { name: 'Jo Smith', email: 'jo@example.com', message: 'hello there' };

test('rejects non-POST', async () => {
  const res = mockRes();
  await loadHandler()({ method: 'GET' }, res);
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, 'POST');
});

test('returns 503 when Supabase is not configured', async () => {
  const res = mockRes();
  await loadHandler({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined })({ method: 'POST', body: valid }, res);
  assert.equal(res.code, 503);
  assert.equal(res.body.ok, false);
});

test('validates name, email and message', async () => {
  const handler = loadHandler();
  stubFetch([]);
  for (const body of [
    { ...valid, email: 'not-an-email' },
    { ...valid, name: '' },
    { ...valid, message: '' },
    { ...valid, message: 'x'.repeat(5001) },
  ]) {
    const res = mockRes();
    await handler({ method: 'POST', body }, res);
    assert.equal(res.code, 400, JSON.stringify(body).slice(0, 60));
  }
});

test('honeypot submissions look successful but write nothing', async () => {
  const calls = [];
  stubFetch(calls);
  const res = mockRes();
  await loadHandler()({ method: 'POST', body: { ...valid, website: 'spam' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(calls.length, 0);
});

test('writes client, inquiry and timeline event, then sends both emails', async () => {
  const calls = [];
  stubFetch(calls);
  const res = mockRes();
  await loadHandler()({ method: 'POST', body: { ...valid, email: '  Jo@Example.COM ' } }, res);

  assert.equal(res.code, 200);
  assert.match(res.body.reference, /^SEN-\d{6}-\d{4}$/);

  assert.match(calls[0].url, /clients\?email=eq\.jo%40example\.com/, 'looks up a lowercased email');
  assert.equal(calls[1].body.email, 'jo@example.com', 'stores the lowercased email');
  assert.match(calls[2].url, /\/inquiries/);
  assert.equal(calls[2].body.client_id, 'client-1');
  assert.match(calls[3].url, /\/inquiry_events/);
  assert.equal(calls[3].body.created_by, 'website-form');

  const emails = calls.filter((c) => c.url.includes('resend.com'));
  assert.equal(emails.length, 2);
  assert.deepEqual(emails[0].body.to, ['claire@example.com', 'ops@example.com']);
  assert.equal(emails[0].body.reply_to, 'jo@example.com');
  assert.ok(!emails[1].body.text.includes('hello there'), 'confirmation stays discreet');
});

test('updates rather than duplicates a returning client', async () => {
  const calls = [];
  stubFetch(calls);
  const inner = globalThis.fetch;
  globalThis.fetch = async (url, opt) => {
    if (String(url).includes('/clients?email=')) {
      calls.push({ url: String(url), method: 'GET', body: null });
      return new Response(JSON.stringify([{ id: 'existing-1' }]), { status: 200 });
    }
    return inner(url, opt);
  };
  const res = mockRes();
  await loadHandler()({ method: 'POST', body: valid }, res);
  assert.equal(res.code, 200);
  const patch = calls.find((c) => c.method === 'PATCH');
  assert.ok(patch, 'patches the existing row');
  assert.match(patch.url, /id=eq\.existing-1/);
});

test('a database failure returns 500 without leaking internals', async () => {
  stubFetch([], { fail: true });
  const res = mockRes();
  const consoleError = console.error; // the handler logs this failure on purpose
  console.error = () => {};
  try {
    await loadHandler()({ method: 'POST', body: valid }, res);
  } finally {
    console.error = consoleError;
  }
  assert.equal(res.code, 500);
  assert.ok(!JSON.stringify(res.body).includes('internal detail'));
});
