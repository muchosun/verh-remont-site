const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),js=fs.readFileSync(path.join(root,'remont-kvartir/quiz.js'),'utf8'),source=require('./fixtures/reference-quiz-copy-20261104.json');
const context={};
vm.runInNewContext(js.slice(js.indexOf('const steps='),js.indexOf('const state='))+js.slice(js.indexOf('function nextStepIndex('),js.indexOf('function fail('))+'this.steps=steps;',context);
test('six-screen flow keeps authorized repair choices and final benefit without mandatory room or channel screens',()=>{
 assert.deepEqual(Array.from(context.steps,s=>s.id),['city','property','dimensions','repair','scope','partialDecision','contact']);
 for(const [id,index]of [['property',2],['repair',5],['scope',6],['partialDecision',7]]){
  assert.deepEqual(Array.from(context.steps.find(s=>s.id===id).options,o=>o[1]),source.steps.find(s=>s.index===index).options,id);
 }
 assert(source.steps.find(s=>s.index===10).text.includes(context.steps.find(s=>s.id==='contact').phonePrompt));
 assert(js.includes(source.steps.find(s=>s.index===1).title));assert(js.includes(source.steps.find(s=>s.index===8).title));
});
test('partial repair requires explicit upgrade or ends without reaching the contact step',()=>{
 for(const scope of ['one','several']){
  assert.equal(context.nextStepIndex(4,{scope}),5);
  assert.equal(context.nextStepIndex(5,{scope,partialDecision:'partial'}),'reject_partial');
  assert.equal(context.nextStepIndex(5,{scope,partialDecision:'full'}),6);
  assert.equal(context.qualifiedScope({scope,partialDecision:'full'}),'full');
  assert.equal(context.qualifiedScope({scope,partialDecision:'partial'}),scope);
 }
 for(const scope of ['preclean','full','other']){assert.equal(context.nextStepIndex(4,{scope}),6);assert.equal(context.qualifiedScope({scope}),scope);}
 assert.match(js,/state\.history\.push\(state\.step\)/);assert.match(js,/state\.step=state\.history\.pop\(\)/);
});
test('source CTA and phone motivation preserve honest receipt and CAPTCHA delegation',()=>{
 assert.match(js,/step.id==='contact'\?'Получить расчёт':'Далее'/);
 assert.match(js,/contact-prompt/);assert.match(js,/scope:qualifiedScope\(state\.answers\)/);
 assert.match(js,/window\.VerhLead\.send/);assert.doesNotMatch(js,/track\(['"]quiz_lead_success/);
 assert.match(js,/Не получили подтверждение доставки/);assert.match(js,/phoneStarted/);
});
