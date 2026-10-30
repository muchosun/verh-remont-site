const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/lead-support.js'), 'utf8');

function load({ href = 'https://verhremont.ru/', linkPath = '/uslugi/dizayn-proekt/', stored = null, blocked = false, captcha = {getToken:async()=> 'test-fresh-token'}, turnstile, scriptError=false, fetch = async () => ({ ok: true, json: async () => ({ status: 'accepted', leadId: 'test' }) }), timeout = setTimeout } = {}) {
  const link = { href: new URL(linkPath,'https://verhremont.ru/').href, getAttribute: () => linkPath };
  const window = {VerhCaptcha:captcha,turnstile};
  const context = { window, URL, AbortController, location: new URL(href), fetch, setTimeout: timeout, clearTimeout,
    document: { querySelectorAll: () => [link],createElement:()=>({remove(){}}),body:{append(){}},head:{append:script=>{if(scriptError)setImmediate(()=>script.onerror());}} },
    sessionStorage: { getItem: () => { if (blocked) throw Error('blocked'); return stored; }, setItem: (_key, value) => { if (blocked) throw Error('blocked'); stored = value; } },
  };
  // Keep the strict-mode rollback contract covered; temporary mode has its own suite.
  vm.runInNewContext(code.replace('const intakeMode = "unverified-all-v1";', 'const intakeMode = "";'), context);
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
test('current design destination retains campaign and its explicit city',()=>{
  const {link}=load({href:'https://verhremont.ru/?utm_source=qa&utm_campaign=TEST_ROUTE&yclid=test&phone=private',linkPath:'/design/?city=krasnodar'});
  const target=new URL(link.href);
  assert.equal(target.searchParams.get('city'),'krasnodar');
  assert.equal(target.searchParams.get('utm_source'),'qa');
  assert.equal(target.searchParams.get('utm_campaign'),'TEST_ROUTE');
  assert.equal(target.searchParams.get('yclid'),'test');
  assert.equal(target.searchParams.has('phone'),false);
});

test('requires delivery acknowledgment, not only HTTP success', async () => {
  for (const body of [{}, { status: 'accepted' }, { status: 'delivery_failed', leadId: 'test' }]) {
    const { api } = load({ fetch: async () => ({ ok: true, json: async () => body }) });
    await assert.rejects(api.send('/lead', {}), /not confirmed/);
  }
  assert.equal((await load().api.send('/lead', {})).status, 'sent');
});
test('CAPTCHA failure blocks the network send and a retry uses a fresh token',async()=>{
  let calls=0,attempt=0;const actions=[],bodies=[];
  const {api}=load({captcha:{getToken:async action=>{actions.push(action);if(++attempt===1)throw Error('Protection unavailable');return 'fresh-'+attempt;}},fetch:async(_url,options)=>{calls++;bodies.push(JSON.parse(options.body));return {ok:true,json:async()=>({status:'accepted',leadId:'test'})};}});
  await assert.rejects(api.send('/lead',{source:'https://verhremont.ru/'}));assert.equal(calls,0);
  await api.send('/lead',{source:'https://verhremont.ru/'});await api.send('/lead',{source:'https://verhremont.ru/'});
  assert.deepEqual(actions,['repair_lead','repair_lead','repair_lead']);assert.equal(bodies[0].turnstileToken,'fresh-2');assert.equal(bodies[1].turnstileToken,'fresh-3');
});
test('legacy design forms use design action and existing tokens are not replaced',async()=>{
  const actions=[];const {api}=load({captcha:{getToken:async a=>{actions.push(a);return 'fresh';}}});
  await api.send('/lead',{source:'https://verhremont.ru/uslugi/dizayn-proekt/?request=design-project'});
  await api.send('/lead',{source:'https://verhremont.ru/',turnstileToken:'existing'});assert.deepEqual(actions,['design_lead']);
});
test('real invisible adapter creates one-use widgets and removes them after each callback',async()=>{
  const actions=[],removed=[],bodies=[];let count=0;
  const turnstile={render:(_element,options)=>{const id=++count;actions.push(options.action);assert.equal(options['response-field'],false);setImmediate(()=>options.callback('token-'+id));return id;},remove:id=>removed.push(id)};
  const {api}=load({captcha:null,turnstile,fetch:async(_url,o)=>{bodies.push(JSON.parse(o.body));return {ok:true,json:async()=>({status:'accepted',leadId:'test'})};}});
  await api.send('/lead',{});await api.send('/lead',{});
  assert.deepEqual(actions,['repair_lead','repair_lead']);assert.deepEqual(removed,[1,2]);assert.equal(bodies[0].turnstileToken,'token-1');assert.equal(bodies[1].turnstileToken,'token-2');
});
test('unavailable CAPTCHA script fails closed before the lead request',async()=>{
  let posts=0;const {api}=load({captcha:null,scriptError:true,fetch:async()=>{posts++;}});
  await assert.rejects(api.send('/lead',{}),/Protection unavailable/);assert.equal(posts,0);
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

test('main quiz emergency acknowledgment remains unverified, never sent',async()=>{
  let duration;
  const {api}=load({timeout:(callback,ms)=>{duration=ms;return setTimeout(callback,1000);},fetch:async()=>({ok:true,json:async()=>({status:'accepted_unverified',qualification:'repair_unverified',leadId:'test'})})});
  const result=await api.send('/lead',{source:'https://verhremont.ru/?utm_source=qa',emergencyTimeoutFallback:'repair-main-timeout-v1'});
  assert.equal(result.status,'unverified');assert.equal(duration,25000);
});
test('unverified acknowledgments cannot pass through other forms or malformed confirmations',async()=>{
  const response=body=>async()=>({ok:true,json:async()=>body});
  const body={status:'accepted_unverified',qualification:'repair_unverified',leadId:'test'};
  for(const payload of [{},{source:'https://verhremont.ru/raschet-remonta/',emergencyTimeoutFallback:'repair-main-timeout-v1'},{kind:'callback',source:'https://verhremont.ru/',emergencyTimeoutFallback:'repair-main-timeout-v1'},{source:'https://verhremont.ru/design/',emergencyTimeoutFallback:'repair-main-timeout-v1'},{source:'https://foreign.invalid/',emergencyTimeoutFallback:'repair-main-timeout-v1'}]){
    await assert.rejects(load({fetch:response(body)}).api.send('/lead',payload),/not confirmed/);
  }
  for(const invalid of [{...body,leadId:undefined},{...body,qualification:undefined},{...body,qualification:'design_brief_v3'}]){
    await assert.rejects(load({fetch:response(invalid)}).api.send('/lead',{source:'https://verhremont.ru/',emergencyTimeoutFallback:'repair-main-timeout-v1'}),/not confirmed/);
  }
});
