const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname,'../script.js'),'utf8');
const start = script.indexOf('leadForm.addEventListener("submit", async (event) => {');
const handler = script.slice(start,script.indexOf('\n});',start)+4);
function fixture(delivery,error) {
  let submit;
  const goals=[];
  const element=()=>({hidden:false,textContent:'',innerHTML:'',classList:{add(){},remove(){}}});
  const state={maxStep:3,apartment:'Новостройка',area:58,level:'standard'};
  const successMessage=element(),leadTitle=element(),leadDescription=element(),button=element();
  const leadForm={dataset:{},hidden:false,addEventListener:(_,fn)=>submit=fn,reportValidity:()=>true,querySelector:()=>button};
  const context={state,leadForm,successMessage,leadTitle,leadDescription,leadPanel:element(),leadLoading:element(),leadOffer:element(),phoneInput:{value:'+79012345678',setCustomValidity(){},reportValidity(){}},timerId:null,
    isQuizStep:()=>true,render(){},createLeadPayload:()=>({}),sendLeadToMax:async()=>{if(error)throw error;return delivery;},waitFor:async()=>{},trackMetricGoal:name=>goals.push(name),
    getSecondarySurcharge:()=>0,getEstimateText:()=>'estimate',getEstimateBreakdownText:()=>'breakdown',formatArea:()=>58,getTariff:()=>({title:'Стандарт'}),getPaymentPlanHtml:()=>'',quizModal:{classList:{contains:()=>false}},window:{clearInterval(){}},
  };
  vm.runInNewContext(handler,context);
  return {run:()=>submit({isTrusted:true,preventDefault(){}}),goals,state,leadTitle,leadForm,successMessage};
}
test('unverified main quiz delivery confirms receipt without any success goal',async()=>{
  const f=fixture({status:'unverified'});await f.run();
  assert.equal(f.state.leadSubmitted,true);assert.equal(f.leadForm.hidden,true);
  assert.match(f.successMessage.innerHTML,/для проверки/);
  assert.deepEqual(f.goals,[]);
});
test('verified main quiz still emits its paid delivery goal once',async()=>{
  const f=fixture({status:'sent'});await f.run();
  assert.deepEqual(f.goals,['quiz_lead_success']);assert.match(f.successMessage.innerHTML,/Заявка отправлена/);
});
test('verified duplicate is acknowledged without another paid goal',async()=>{
  const f=fixture({status:'sent',duplicate:true});await f.run();
  assert.equal(f.state.leadSubmitted,true);assert.deepEqual(f.goals,[]);
});
test('failed MAX delivery still displays failure, never successful receipt',async()=>{
  const f=fixture(null,new Error('MAX failed'));await f.run();
  assert.equal(f.state.leadSubmitted,false);assert.equal(f.leadForm.hidden,false);assert.equal(f.leadTitle.textContent,'Отправка не подтверждена');assert.deepEqual(f.goals,['quiz_lead_failure']);
});
test('emergency opt-in is present only in main quiz payload, never the callback',()=>{
  const payload=script.slice(script.indexOf('function createLeadPayload()'),script.indexOf('\nasync function sendLeadToMax'));
  assert.match(payload,/emergencyTimeoutFallback: 'repair-main-timeout-v1'/);
  const callback=script.slice(script.indexOf('callbackForm?.addEventListener("submit"'),start);
  assert.equal(callback.includes('emergencyTimeoutFallback'),false);
});
