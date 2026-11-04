const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),js=fs.readFileSync(path.join(root,'remont-kvartir/quiz.js'),'utf8'),source=require('./fixtures/reference-quiz-copy-20261104.json');
const context={};
vm.runInNewContext(js.slice(js.indexOf('const steps='),js.indexOf('const state='))+js.slice(js.indexOf('function nextStepIndex('),js.indexOf('function fail('))+'this.steps=steps;',context);
test('every main and conditional question and choice matches the authorized source copy',()=>{
 const indices=[0,2,3,4,5,6,7,9,10];
 for(let i=0;i<context.steps.length;i++){
  const actual=context.steps[i],expected=source.steps.find(s=>s.index===indices[i]);
  assert.equal(actual.title,expected.title,actual.id);
  if(actual.options)assert.deepEqual(Array.from(actual.options,o=>o[1]),expected.options,actual.id);
 }
 assert(source.steps.find(s=>s.index===10).text.includes(context.steps[8].phonePrompt));
 assert(js.includes(source.steps.find(s=>s.index===1).title));assert(js.includes(source.steps.find(s=>s.index===8).title));
});
test('partial repair requires explicit upgrade or ends without reaching the contact step',()=>{
 for(const scope of ['one','several']){
  assert.equal(context.nextStepIndex(5,{scope}),6);
  assert.equal(context.nextStepIndex(6,{scope,partialDecision:'partial'}),'reject_partial');
  assert.equal(context.nextStepIndex(6,{scope,partialDecision:'full'}),7);
  assert.equal(context.qualifiedScope({scope,partialDecision:'full'}),'full');
  assert.equal(context.qualifiedScope({scope,partialDecision:'partial'}),scope);
 }
 for(const scope of ['preclean','full','other']){assert.equal(context.nextStepIndex(5,{scope}),7);assert.equal(context.qualifiedScope({scope}),scope);}
 assert.match(js,/state\.history\.push\(state\.step\)/);assert.match(js,/state\.step=state\.history\.pop\(\)/);
});
test('source CTA and phone motivation preserve honest receipt and CAPTCHA delegation',()=>{
 assert.match(js,/next\.querySelector\('span'\)\.textContent='Далее'/);
 assert.match(js,/contact-prompt/);assert.match(js,/scope:qualifiedScope\(state\.answers\)/);
 assert.match(js,/window\.VerhLead\.send/);assert.doesNotMatch(js,/track\(['"]quiz_lead_success/);
 assert.match(js,/Не получили подтверждение доставки/);assert.match(js,/phoneStarted/);
});
