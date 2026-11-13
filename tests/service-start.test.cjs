const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '../uslugi/script.js'), 'utf8');

function setup({ available = true, throws = false } = {}) {
  const goals = [], handlers = {}, buttons = {};
  const phone = { addEventListener: (name, fn) => handlers[name] = fn, removeAttribute() {}, focus() { handlers.focus?.(); } };
  const status = { textContent: '', removeAttribute() {} };
  const form = { elements: { phone }, querySelector: selector => selector === '[data-form-status]' ? status : {}, addEventListener() {} };
  const lead = { querySelector: () => phone, scrollIntoView() {} };
  const track = (_, method, goal) => { if (throws) throw Error('SDK failed'); if (method === 'reachGoal') goals.push(goal); };
  const window = { setTimeout: fn => fn(), ...(available ? { ym: track } : {}) };
  vm.runInNewContext(code, { window, location: { protocol: 'https:', hostname: 'verhremont.ru' }, document: {
    body: { dataset: { serviceSlug: 'ukladka-laminata' } },
    querySelector: selector => selector === '[data-service-form]' ? form : selector === '#lead' ? lead : null,
    querySelectorAll: selector => selector === '[data-scroll-lead]' ? [{ addEventListener: (name, fn) => buttons[name] = fn }] : [],
  } });
  return { goals, handlers, buttons, window, track };
}

test('direct phone focus/input records service start once without a CTA', () => {
  const f = setup(); f.handlers.focus(); f.handlers.input(); f.handlers.focus();
  assert.deepEqual(f.goals, ['service_lead_start']);
});
test('CTA plus automatic focus does not duplicate service start', () => {
  const f = setup(); f.buttons.click({ currentTarget: { dataset: {} } }); f.handlers.input();
  assert.deepEqual(f.goals, ['service_lead_start']);
});
test('a delayed SDK can record start on the next input', () => {
  const f = setup({ available: false }); f.handlers.focus(); f.window.ym = f.track; f.handlers.input();
  assert.deepEqual(f.goals, ['service_lead_start']);
});
test('SDK failure does not block phone interaction', () => {
  const f = setup({ throws: true }); assert.doesNotThrow(() => f.handlers.focus()); assert.doesNotThrow(() => f.handlers.input());
});
