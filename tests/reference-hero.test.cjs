const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../remont-kvartir/index.html'), 'utf8');
const script = html.match(/<script id="hero-intent">([\s\S]*?)<\/script>/)[1];

test('primary CTA precedes benefits and retains quiz hook', () => {
  assert(html.indexOf('data-open-quiz') < html.indexOf('class="benefits"'));
  assert.match(html, /Телефон попросим только в конце/);
  assert.match(html, /При договоре на ремонт/);
  assert.match(html, /Состав подарков и условия согласуем заранее/);
  assert.doesNotMatch(html, /Любой тариф/);
});

for (const [intent, expected] of Object.entries({
  turnkey: 'Ремонт квартир под ключ', newbuild: 'Ремонт в новостройке',
  resale: 'Ремонт вторичной квартиры', dogma: 'Ремонт в ЖК Догма Парк'
})) {
  test(`allowlisted intent: ${intent}`, () => {
    const span = {textContent: 'default'};
    vm.runInNewContext(script, {URLSearchParams, location: {search: '?intent=' + intent}, document: {querySelector: () => span}});
    assert.equal(span.textContent, expected);
  });
}
for (const intent of ['', 'unknown', '__proto__', '<img src=x onerror=alert(1)>']) {
  test(`unknown intent keeps default: ${intent}`, () => {
    const span = {textContent: 'default'};
    vm.runInNewContext(script, {URLSearchParams, location: {search: '?intent=' + encodeURIComponent(intent)}, document: {querySelector: () => span}});
    assert.equal(span.textContent, 'default');
  });
}
