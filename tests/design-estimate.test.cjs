const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../design/decora.js'), 'utf8');

function fixture() {
  const node = (value = '') => ({value, textContent:'', hidden:false, disabled:false, events:{},
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); },
    emit(name) { for (const fn of this.events[name] || []) fn(); },
    setAttribute() {}, removeAttribute() {},
  });
  const estimate = node('40'), area = node(), packages = node(), total = node();
  const summary = node(), label = node(), price = node(), mode = node('brief');
  const proceed = node(), toggle = node(), back = node();
  const nodes = {'[data-estimate-area]':estimate,'[data-form-area]':area,'[data-estimate-total]':total,
    'select[name="package"]':packages,'[data-form-estimate]':summary,'[data-form-estimate-label]':label,
    '[data-form-estimate-total]':price,'[data-estimate-continue]':proceed,'[name="leadMode"]':mode,
    '[data-brief-version]':{},'[data-quiz-mode]':toggle,'[data-quiz-back]':back};
  vm.runInNewContext(source, {Intl, document:{querySelector:s=>nodes[s] || null, querySelectorAll:()=>[proceed]}});
  return {estimate,area,packages,total,summary,label,price,mode,proceed,toggle,back};
}

test('initial calculator does not invent apartment area or a form total', () => {
  const f = fixture();
  assert.equal(f.area.value, '');
  assert.match(f.price.textContent, /Укажите площадь/);
  assert.equal(f.proceed.disabled, false);
});
test('explicit continue transfers even an unchanged calculator value', () => {
  const f = fixture(); f.proceed.emit('click');
  assert.equal(f.area.value, '40');
  assert.match(f.price.textContent, /40 м² · 20\s000 ₽/);
});
test('calculator and manual area both update the visible form price', () => {
  const f = fixture(); f.estimate.value = '60'; f.estimate.emit('input');
  assert.equal(f.area.value, '60'); assert.match(f.price.textContent, /30\s000 ₽/);
  f.area.value = '45.5'; f.area.emit('input');
  assert.equal(f.estimate.value, '45.5'); assert.match(f.price.textContent, /45,5 м² · 22\s750 ₽/);
});
test('invalid or cleared area never leaves a stale price or an enabled calculator CTA', () => {
  const f = fixture(); f.proceed.emit('click');
  for (const value of ['', '0', '29', '10001', 'invalid']) {
    f.estimate.value = value; f.estimate.emit('input');
    assert.doesNotMatch(f.price.textContent, /20\s000/);
    assert.equal(f.proceed.disabled, true);
  }
});
test('package change uses its own rate and minimum without mispricing full design', () => {
  const f = fixture(); f.area.value='60'; f.area.emit('input');
  f.packages.value='Полный — 3 490 ₽/м²'; f.packages.emit('change');
  assert.match(f.label.textContent, /Полный/); assert.match(f.price.textContent, /209\s400 ₽/);
  f.area.value='40'; f.area.emit('input');
  assert.match(f.price.textContent, /от 50 м²/);
  f.packages.value='Рабочий проект — 500 ₽/м²'; f.packages.emit('change');
  assert.match(f.price.textContent, /20\s000 ₽/);
});
test('gift and undecided packages retain their conditions instead of a standalone quote', () => {
  const f=fixture(); f.proceed.emit('click');
  f.packages.value='Рабочий проект в подарок + ремонт, любой тариф'; f.packages.emit('change');
  assert.match(f.label.textContent, /договоре на ремонт в Краснодаре/);
  assert.match(f.price.textContent, /0 ₽/);
  f.packages.value='Не определился'; f.packages.emit('change');
  assert.match(f.price.textContent, /Уточним/);
});
test('callback hides the project quote and return restores it', () => {
  const f=fixture(); f.proceed.emit('click'); f.mode.value='callback'; f.toggle.emit('click');
  assert.equal(f.summary.hidden,true);
  f.mode.value='brief'; f.back.emit('click'); assert.equal(f.summary.hidden,false);
  assert.match(f.price.textContent,/20\s000 ₽/);
});
test('continuation uses the existing quiz CTA and summary precedes form fields', () => {
  const html=fs.readFileSync(path.join(__dirname,'../design/index.html'),'utf8');
  assert.match(html, /<button[^>]*type="button"[^>]*data-estimate-continue[^>]*data-scroll-lead/);
  assert.ok(html.indexOf('data-form-estimate') < html.indexOf('<fieldset data-quiz-step="0">'));
});
