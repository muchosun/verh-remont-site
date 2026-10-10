const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../uslugi/script.js'), 'utf8');

async function submit({ local = false, request = 'design-project', slug = 'dizayn-proekt', result = { status: 'sent' }, reject = false, phoneValue = '+7 (999) 000-00-00' } = {}) {
  const goals = [];
  let handler;
  let sends = 0;
  const phone = { value: phoneValue, addEventListener() {}, toggleAttribute() {}, focus() {} };
  const status = { dataset: {}, textContent: '', removeAttribute() {} };
  const button = { disabled: false };
  const form = {
    elements: { phone, consent: { checked: true }, website: { value: '' }, package: { value: 'Проект с инженеркой — 500 ₽/м²' } },
    querySelector: selector => selector === "button[type='submit']" ? button : selector === '[data-form-status]' ? status : phone,
    addEventListener: (_, callback) => { handler = callback; },
  };
  const context = {
    URL,
    console: { error() {} },
    location: { protocol: 'https:', hostname: local ? '127.0.0.1' : 'verhremont.ru' },
    document: {
      body: { dataset: { service: 'Дизайн-проект квартиры', serviceSlug: slug, request } },
      querySelector: selector => selector === '[data-service-form]' ? form : null,
      querySelectorAll: () => [],
    },
    window: {
      VERH_LEAD_ENDPOINT: '/lead',
      ym: (_, method, goal) => { if (method === 'reachGoal') goals.push(goal); },
      setTimeout: callback => callback(),
      VerhLead: {
        source: () => new URL('https://verhremont.ru/uslugi/dizayn-proekt/?utm_campaign=design'),
        send: async (_, payload) => {
          sends++;
          assert.match(payload.source, /request=design-project|request=measurement/);
          assert.match(payload.source, /utm_campaign=design/);
          if (reject) throw new Error('Delivery failed');
          return result;
        },
      },
    },
  };
  vm.runInNewContext(code, context);
  await handler({ preventDefault() {} });
  return { goals, sends, status };
}

test('paid design goal fires only after confirmed production delivery', async () => {
  const result = await submit();
  assert.equal(result.sends, 1);
  assert.equal(result.goals.filter(g => g === 'design_project_lead_delivered').length, 1);
  assert.equal(result.status.dataset.state, 'success');
});

for (const [name, options] of [
  ['local preview', { local: true }],
  ['failed delivery', { reject: true }],
  ['unconfirmed response', { result: { status: 'accepted' } }],
  ['missing response', { result: null }],
  ['another service', { request: 'measurement', slug: 'ukladka-laminata' }],
  ['another slug', { slug: 'priemka-kvartiry' }],
  ['invalid phone', { phoneValue: '123' }],
]) {
  test(`paid design goal does not fire for ${name}`, async () => {
    const result = await submit(options);
    assert.equal(result.goals.includes('design_project_lead_delivered'), false);
  });
}
