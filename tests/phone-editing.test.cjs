const test = require('node:test');
const assert = require('node:assert/strict');
const Inputmask = require('../assets/vendor/inputmask-5.0.9.min').default;
const phone = require('../assets/js/phone-input');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('an explicit country prefix is not promoted into a missing subscriber digit', () => {
  for (const value of ['+7 (999) 000-12-3', '8 (999) 000-12-3']) {
    assert.equal(phone.national(value), '999000123');
    const formatted = Inputmask.format(value, phone.options());
    assert.equal(formatted, '+7 (999) 000-12-3_');
    assert.equal(Inputmask.isValid(formatted, phone.options()), false);
  }
});

test('partial formatting and refocusing never create subscriber digits', () => {
  for (let length = 0; length <= 10; length++) {
    const digits = '9990001234'.slice(0, length);
    for (const prefix of ['+7 ', '8 (']) {
      const raw = prefix + digits;
      assert.equal(phone.national(raw), digits);
      const formatted = Inputmask.format(raw, phone.options());
      assert.equal(phone.national(formatted), digits);
      assert.equal(Inputmask.format(formatted, phone.options()), formatted);
    }
  }
});

test('a bare ten-digit subscriber number keeps its first digit', () => {
  for (const digits of ['9990001234', '7990001234', '8990001234']) {
    assert.equal(phone.national(digits), digits);
    const formatted = Inputmask.format(digits, phone.options());
    assert.equal(phone.national(formatted), digits);
  }
});

test('complete formatted and pasted numbers still resolve to the same subscriber', () => {
  for (const raw of ['9990001234', '79990001234', '89990001234', '+7 (999) 000-12-34', '8 (999) 000-12-34']) {
    assert.equal(Inputmask.format(raw, phone.options()), '+7 (999) 000-12-34');
  }
});

test('normalization accepts complete common formats and never fills a missing digit', () => {
  for (const raw of ['9990001234', '79990001234', '89990001234', '+7 (999) 000-12-34', '8 (999) 000-12-34']) {
    assert.equal(phone.normalize(raw), '+79990001234');
  }
  for (const raw of ['', '+7', '+7 (999) 000-12-3', '8 (999) 000-12-3', '+3 9990001234', '799900012345']) {
    assert.equal(phone.normalize(raw), '');
  }
});

test('the shared control leaves typing alone and formats only complete values on blur/change', () => {
  const handlers = {};
  const input = {type:'tel', dataset:{}, autocomplete:'', value:'', setAttribute(){}, addEventListener:(event,fn)=>{ handlers[event]=fn; }};
  let maskCalls = 0;
  const Library = () => { maskCalls++; throw Error('Typing must not be masked'); };
  Library.format = Inputmask.format;
  const window = {Inputmask:Library, document:{readyState:'complete', documentElement:{nodeType:1,matches:()=>false,querySelectorAll:()=>[input]},body:{}}, MutationObserver:class{observe(){}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/js/phone-input.js'),'utf8'),{window});
  assert.equal(input.dataset.verhPhoneInput, 'free');
  assert.equal(input.inputMode, 'tel');
  assert.equal(input.autocomplete, 'tel');
  assert.equal(input.maxLength, 64);
  assert.equal(typeof handlers.input, 'function');
  assert.equal(maskCalls, 0);
  for (const value of ['8 (999) 000-12-3', '+7 (999) 000-12-3', '99900']) {
    input.value = value; handlers.input(); handlers.blur(); assert.equal(input.value, value);
  }
  for (const value of ['89990001234', '9990001234', '+7 (999) 000-12-34']) {
    input.value = value; handlers.change(); assert.equal(input.value, '+7 (999) 000-12-34');
  }
  input.value = '89990001234'; handlers.input();
  assert.equal(input.value, '+7 (999) 000-12-34');
  input.value = input.value.slice(0,-1); handlers.input(); handlers.blur();
  assert.equal(input.value, '+7 (999) 000-12-3');
});

test('repair and service validators do not turn an explicitly partial number into a full one', () => {
  const root = path.join(__dirname, '..');
  const functions = [];
  const reference = fs.readFileSync(path.join(root,'remont-kvartir/quiz.js'),'utf8');
  const referenceContext = {};
  vm.runInNewContext(reference.slice(reference.indexOf('function phoneDigits('),reference.indexOf('function hasPhoneInput(')),referenceContext);
  functions.push(value => referenceContext.phoneDigits(value));
  const calculator = fs.readFileSync(path.join(root,'raschet-remonta/script.js'),'utf8');
  const calculatorContext = {};
  vm.runInNewContext(calculator.slice(calculator.indexOf('function normalizePhone('),calculator.indexOf('function formatPhoneForDisplay(')),calculatorContext);
  functions.push(value => calculatorContext.normalizePhone(value));
  for (const file of ['uslugi/script.js']) {
    const source = fs.readFileSync(path.join(root,file),'utf8');
    const context = {};
    vm.runInNewContext(source.slice(source.indexOf('const normalizePhone ='),source.indexOf('  const form ='))+'\nthis.normalizePhone=normalizePhone;',context);
    functions.push(value => context.normalizePhone(value));
  }
  for (const normalize of functions) {
    for (const value of ['9990001234','79990001234','89990001234','+7 (999) 000-12-34','8 (999) 000-12-34']) {
      assert.equal(normalize(value).replace(/\D/g,''), '79990001234');
    }
    for (const value of ['+7 (999) 000-12-3','8 (999) 000-12-3']) assert.equal(normalize(value), '');
  }
});

test('main and callback phone normalization works even if the formatting asset is unavailable', () => {
  const source = fs.readFileSync(path.join(__dirname,'../script.js'),'utf8');
  const code = source.slice(source.indexOf('function normalizeLeadPhone('),source.indexOf('function createLeadPayload('));
  for (const window of [{},{VerhPhoneInput:phone}]) {
    const context = {window}; vm.runInNewContext(code,context);
    for (const value of ['9990001234','79990001234','89990001234','+7 (999) 000-12-34','8 (999) 000-12-34']) {
      assert.equal(context.normalizeLeadPhone(value), '+79990001234');
    }
    for (const value of ['+7 (999) 000-12-3','8 (999) 000-12-3','799900012345']) {
      assert.equal(context.normalizeLeadPhone(value), '');
    }
  }
});
