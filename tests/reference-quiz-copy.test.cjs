const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),js=fs.readFileSync(path.join(root,'remont-kvartir/quiz.js'),'utf8'),source=require('./fixtures/reference-quiz-copy-20261104.json');
const context={};
vm.runInNewContext(js.slice(js.indexOf('const steps='),js.indexOf('const state='))+js.slice(js.indexOf('function nextStepIndex('),js.indexOf('function fail('))+'this.steps=steps;',context);
test('six-screen flow keeps authorized repair choices and final benefit without mandatory room or channel screens',()=>{
 assert.deepEqual(Array.from(context.steps,s=>s.id),['city','property','dimensions','repair','scope','contact']);
 for(const [id,index]of [['property',2],['repair',5],['scope',6]]){
  assert.deepEqual(Array.from(context.steps.find(s=>s.id===id).options,o=>o[1]),source.steps.find(s=>s.index===index).options,id);
 }
 assert(source.steps.find(s=>s.index===10).text.includes(context.steps.find(s=>s.id==='contact').phonePrompt));
 assert(js.includes(source.steps.find(s=>s.index===1).title));
});
test('every work scope continues directly to contact without an upsell or rejection',()=>{
 for(const scope of ['one','several','preclean','full','other'])assert.equal(context.nextStepIndex(4,{scope}),5);
 assert.equal(context.steps[5].id,'contact');
 assert.doesNotMatch(js,/partialDecision|reject_partial|partial_scope_rejected|data-return-scope/);
 assert.match(js,/scope:state\.answers\.scope/);
 assert.match(js,/обсудим объём работ/);
 assert.match(js,/state\.history\.push\(state\.step\)/);assert.match(js,/state\.step=state\.history\.pop\(\)/);
});
test('source CTA and phone motivation preserve honest receipt and CAPTCHA delegation',()=>{
 assert.match(js,/step.id==='contact'\?'Получить расчёт':'Далее'/);
 assert.match(js,/contact-prompt/);assert.match(js,/scope:state\.answers\.scope/);
 assert.match(js,/window\.VerhLead\.send/);assert.doesNotMatch(js,/track\(['"]quiz_lead_success/);
 assert.match(js,/Не получили подтверждение доставки/);assert.match(js,/phoneStarted/);
});
