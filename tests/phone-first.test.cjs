const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const calculator = fs.readFileSync(path.join(root, 'raschet-remonta/script.js'), 'utf8');

function handler(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n});', start) + 4);
}

function phoneFixture(kind, {phone = '+79012345678', consent = true, active = true} = {}) {
  let submit;
  const steps = [], goals = [], captures = [];
  const state = {step:kind === 'main' ? 0 : 1, leadPhone:'', phone:'', phoneConfirmed:false, phoneReturnStep:kind === 'main' ? 1 : 2};
  const phoneInput = {value:phone, invalid:'', setCustomValidity(value){this.invalid = value;}, reportValidity(){}};
  const quizPhoneForm = {addEventListener:(_, fn) => submit = fn, reportValidity:() => consent};
  const context = {
    window:{VerhRepairDraft:{capture:(_, payload)=>captures.push(payload)},VerhLead:{source:()=>({href:'https://verhremont.ru/'})}},
    leadEndpoint:'https://endpoint.invalid',leadForm:{elements:{website:{value:''}}},
    state, phoneInput, quizPhoneForm, isQuizStep:step => active && state.step === step,
    normalizePhone:value => /^\+7\d{10}$/.test(value) ? value : '', formatPhoneForDisplay:value => value,
    resetLeadResult(){state.leadSubmitted = false;},
    trackMetricGoal:(name, params) => goals.push({name, params}), trackGoal:(name, params) => goals.push({name, params}),
    setStep:step => steps.push(step),
  };
  vm.runInNewContext(handler(kind === 'main' ? main : calculator, 'quizPhoneForm.addEventListener("submit", event => {'), context);
  return {state, steps, goals, captures, phoneInput, run:trusted => submit({isTrusted:trusted ?? true, preventDefault(){}})};
}

for (const kind of ['calculator']) {
  test(`${kind}: first phone saves an incomplete draft without full delivery or paid conversion`, () => {
    const f = phoneFixture(kind); f.run();
    assert.equal(f.state.phoneConfirmed, true);
    assert.equal(f.state[kind === 'main' ? 'leadPhone' : 'phone'], '+79012345678');
    assert.deepEqual(f.steps, [kind === 'main' ? 1 : 2]);
    assert.equal(f.goals.length, 1);
    assert.equal(f.goals[0].params.action, 'phone_continue');
    assert.equal(f.captures.length, 1);
    assert.equal(f.captures[0].consent, true);
    assert.doesNotMatch(JSON.stringify(f.goals), /79012345678|success|delivered|submit_attempt/);
    const block = handler(kind === 'main' ? main : calculator, 'quizPhoneForm.addEventListener("submit", event => {');
    assert.doesNotMatch(block, /sendLead|fetch\(|VerhLead\.send|localStorage|sessionStorage/);
  });

  test(`${kind}: invalid phone, missing consent and synthetic submit cannot advance`, () => {
    for (const options of [{phone:''}, {phone:'+7123'}, {consent:false}]) {
      const f = phoneFixture(kind, options); f.run();
      assert.equal(f.state.phoneConfirmed, false);
      assert.deepEqual(f.steps, []);
      assert.deepEqual(f.goals, []);
      assert.deepEqual(f.captures, []);
    }
    const f = phoneFixture(kind); f.run(false);
    assert.equal(f.state.phoneConfirmed, false);
    assert.deepEqual(f.steps, []);
  });

  test(`${kind}: final delivery requires previously accepted phone and full quiz`, async () => {
    let submit, requests = 0;
    const state = {step:kind === 'main' ? 4 : 6, maxStep:4, phoneConfirmed:false};
    const leadForm = {addEventListener:(_, fn) => submit = fn, dataset:{}};
    const source = kind === 'main' ? main : calculator;
    vm.runInNewContext(handler(source, 'leadForm.addEventListener("submit", async (event) => {'), {
      state, leadForm, isQuizStep:() => true, sendLeadToMax(){requests++;}, sendLead(){requests++;},
    });
    await submit({isTrusted:true, preventDefault(){}});
    assert.equal(requests, 0);
  });
}

test('the long calculator still places a unique phone form before apartment questions', () => {
  for (const name of ['raschet-remonta/index.html']) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    assert.equal((html.match(/id="phone-input"/g) || []).length, 1);
    assert.ok(html.indexOf('id="quiz-phone-form"') < html.indexOf('data-apartment='));
    const first = html.slice(html.indexOf('id="quiz-phone-form"'), html.indexOf('</form>', html.indexOf('id="quiz-phone-form"')));
    assert.match(first, /personal_data_consent/);
    assert.match(first, /Продолжить расчёт/);
    assert.ok(html.indexOf('id="lead-form"') > html.indexOf('data-level='));
  }
});

test('changing project answers never erases the phone accepted at the first step', () => {
  const start = main.indexOf('function resetLeadResult()');
  const reset = main.slice(start, main.indexOf('\nfunction prepareQuizMedia()', start));
  assert.doesNotMatch(reset, /state\.leadPhone\s*=|state\.phoneConfirmed\s*=/);
});

test('local main preview cannot send a real lead', async () => {
  const start = main.indexOf('async function sendLeadToMax(payload)');
  const code = main.slice(start, main.indexOf('\nfunction waitFor(', start));
  let requests = 0;
  const context = {window:{VerhLead:{send(){requests++;}}}, location:{protocol:'http:', hostname:'127.0.0.1'}};
  vm.runInNewContext(code, context);
  assert.equal((await context.sendLeadToMax({})).status, 'preview');
  assert.equal(requests, 0);
});
