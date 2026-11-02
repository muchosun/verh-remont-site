const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/repair-draft.js'),'utf8');
function fixture(fetch,hostname='verhremont.ru') {
  const window={ym(){throw Error('Draft must not call analytics goals');}};
  vm.runInNewContext(source,{window,location:{hostname,protocol:'https:'},fetch,AbortController,setTimeout,clearTimeout});
  return window.VerhRepairDraft;
}
const payload={phone:'+79012345678',source:'https://verhremont.ru/?utm_source=qa',consent:true};
const saved={status:'draft_saved',qualification:'incomplete',paidGoal:false,formType:'repair_main',successGoals:[],receipt:'signed-unit-receipt'};
test('draft posts only explicit contact, keeps receipt in memory and never calls CAPTCHA or goals',async()=>{
  const calls=[],draft=fixture(async(...args)=>{calls.push(args);return {ok:true,json:async()=>saved};});
  await Promise.all([draft.capture('https://endpoint.invalid',payload),draft.capture('https://endpoint.invalid',payload)]);
  assert.equal(calls.length,1);assert.equal(await draft.receipt(),saved.receipt);assert.equal(calls[0][1].keepalive,true);
  const body=JSON.parse(calls[0][1].body);assert.equal(body.kind,'repair_draft');assert.equal(body.consent,true);assert.equal(body.intakeMode,'smartcaptcha-monitor-v1');
  assert.equal(body.apartment,undefined);assert.equal(body.smartCaptchaToken,undefined);assert.doesNotMatch(source,/reachGoal|localStorage|sessionStorage/);
});
test('failed draft can be retried and cannot prevent final full delivery',async()=>{
  let calls=0;const draft=fixture(async()=>{if(calls++===0)throw Error('offline');return {ok:true,json:async()=>saved};});
  assert.equal(await draft.capture('https://endpoint.invalid',payload),null);assert.equal(await draft.receipt(),undefined);
  assert.equal((await draft.capture('https://endpoint.invalid',payload)).status,'draft_saved');assert.equal(calls,2);
});
for(const body of [{...saved,paidGoal:true},{...saved,status:'accepted_unverified'},{...saved,qualification:'verified'},{...saved,successGoals:['quiz_lead_success']}]) test('rejects an unsafe draft receipt '+JSON.stringify(body),async()=>{
  const draft=fixture(async()=>({ok:true,json:async()=>body}));assert.equal(await draft.capture('https://endpoint.invalid',payload),null);assert.equal(await draft.receipt(),undefined);
});
test('local preview never posts a draft',async()=>{
  let calls=0;const draft=fixture(async()=>{calls++;},'127.0.0.1');assert.equal((await draft.capture('https://endpoint.invalid',payload)).status,'preview');assert.equal(calls,0);assert.equal(await draft.receipt(),undefined);
});
