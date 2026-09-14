const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/lead-support.js'), 'utf8');

function load({ href = 'https://verhremont.ru/', stored = null, blocked = false, fetch = async () => ({ ok: true, json: async () => ({ status: 'accepted', leadId: 'test' }) }), timeout = setTimeout } = {}) {
  const link = { href: 'https://verhremont.ru/uslugi/dizayn-proekt/', getAttribute: () => '/uslugi/dizayn-proekt/' };
  const window = {};
  const context = { window, URL, AbortController, location: new URL(href), fetch, setTimeout: timeout, clearTimeout,
    document: { querySelectorAll: () => [link] },
    sessionStorage: { getItem: () => { if (blocked) throw Error('blocked'); return stored; }, setItem: (_key, value) => { if (blocked) throw Error('blocked'); stored = value; } },
  };
  vm.runInNewContext(code, context);
  return { api: window.VerhLead, link, stored: () => stored };
}

test('carries campaign to service link and payload, not arbitrary parameters', () => {
  const { api, link } = load({ href: 'https://verhremont.ru/?utm_source=yandex&utm_campaign=repair&yclid=123&phone=private&hero_variant=trust' });
  const target = new URL(link.href);
  assert.equal(target.searchParams.get('utm_source'), 'yandex');
  assert.equal(target.searchParams.get('yclid'), '123');
  assert.equal(target.searchParams.has('phone'), false);
  assert.equal(target.searchParams.has('hero_variant'), false);
  assert.equal(api.source('https://verhremont.ru/uslugi/').searchParams.get('utm_campaign'), 'repair');
});

test('restores saved campaign and replaces it on new campaign entry', () => {
  const stored = JSON.stringify({ utm_source: 'old', utm_campaign: 'old-campaign' });
  assert.equal(load({ stored }).api.source().searchParams.get('utm_source'), 'old');
  const next = load({ stored, href: 'https://verhremont.ru/?utm_source=new' });
  assert.equal(new URL(next.link.href).searchParams.has('utm_campaign'), false);
  assert.equal(JSON.parse(next.stored()).utm_source, 'new');
});

test('works with blocked storage', () => {
  const { link } = load({ blocked: true, href: 'https://verhremont.ru/?utm_source=yandex' });
  assert.equal(new URL(link.href).searchParams.get('utm_source'), 'yandex');
});

test('requires delivery acknowledgment, not only HTTP success', async () => {
  for (const body of [{}, { status: 'accepted' }, { status: 'delivery_failed', leadId: 'test' }]) {
    const { api } = load({ fetch: async () => ({ ok: true, json: async () => body }) });
    await assert.rejects(api.send('/lead', {}), /not confirmed/);
  }
  assert.equal((await load().api.send('/lead', {})).status, 'sent');
});

test('network and HTTP failures reject; a subsequent retry may succeed', async () => {
  let attempt = 0;
  const { api } = load({ fetch: async () => {
    attempt++;
    if (attempt === 1) throw Error('offline');
    if (attempt === 2) return { ok: false, status: 500 };
    return { ok: true, json: async () => ({ status: 'accepted', leadId: 'test' }) };
  } });
  await assert.rejects(api.send('/lead', {}), /offline/);
  await assert.rejects(api.send('/lead', {}), /500/);
  assert.equal((await api.send('/lead', {})).status, 'sent');
});

test('aborts a stalled request after the configured timeout', async () => {
  let duration;
  const { api } = load({ timeout: (callback, ms) => { duration = ms; return setTimeout(callback, 1); },
    fetch: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')))),
  });
  await assert.rejects(api.send('/lead', {}), /aborted/);
  assert.equal(duration, 15000);
});
