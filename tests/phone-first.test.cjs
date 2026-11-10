const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),calculator=fs.readFileSync(path.join(root,'raschet-remonta/script.js'),'utf8'),html=fs.readFileSync(path.join(root,'raschet-remonta/index.html'),'utf8');
test('calculator asks questions before its only phone field, with no early contact delivery',()=>{
 assert.equal((html.match(/id="phone-input"/g)||[]).length,1);
 assert(html.indexOf('id="phone-input"')>html.indexOf('data-level='));
 assert.match(html,/id="lead-form" data-phone-flow="phone_last"/);
 assert.doesNotMatch(html,/quiz-phone-form|repair-draft\.js/);
 assert.doesNotMatch(calculator,/phoneConfirmed|phoneReturnStep|VerhRepairDraft/);
 assert.match(calculator,/const QUIZ_STEPS = \[3, 4, 5, 6\]/);
 const start=calculator.slice(calculator.indexOf('welcomeStartButton.addEventListener'),calculator.indexOf('startCalculatorButton.addEventListener'));
 assert.match(start,/setStep\(3\)/);
});
test('calculator phone submit still refuses synthetic, hidden, sending and incomplete project actions',async()=>{
 const marker='leadForm.addEventListener("submit", async (event) => {';
 const start=calculator.indexOf(marker),block=calculator.slice(start,calculator.indexOf('\n});',start)+4);
 for(const state of [{step:0},{step:6,sending:true},{step:6,area:58},{step:6,apartment:'Новостройка'}]){
  let submit,requests=0;
  vm.runInNewContext(block,{leadForm:{addEventListener:(_,fn)=>submit=fn},state,sendLead:()=>requests++});
  await submit({isTrusted:true,preventDefault(){}});assert.equal(requests,0);
 }
});
test('local calculator preview cannot send a real lead',async()=>{
 const code=calculator.slice(calculator.indexOf('async function sendLead('),calculator.indexOf('function renderEstimate('));
 let calls=0;const c={isLocalPreview:true,window:{setTimeout:fn=>fn(),VerhLead:{send:()=>calls++}}};
 vm.runInNewContext(code,c);assert.equal((await c.sendLead({})).status,'preview');assert.equal(calls,0);
});
