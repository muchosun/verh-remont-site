const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname,'../raschet-remonta/script.js'),'utf8');
const html = fs.readFileSync(path.join(__dirname,'../raschet-remonta/index.html'),'utf8');
const fn = script.slice(script.indexOf('async function sendLead(payload)'),script.indexOf('\nfunction renderEstimate()'));
function fixture({send,local=false,endpoint='https://endpoint.invalid'}={}) {
  const context={window:{VerhLead:{send},setTimeout:fn=>fn()},isLocalPreview:local,leadEndpoint:endpoint};
  vm.runInNewContext(fn,context);
  return context.sendLead;
}
test('calculator loads shared invisible CAPTCHA delivery before its own handlers',()=>{
  assert.ok(html.indexOf('../assets/js/lead-support.js?')>0);
  assert.ok(html.indexOf('../assets/js/lead-support.js?')<html.indexOf('src="script.js?'));
  assert.equal(fn.includes('fetch('),false);
  assert.equal(fn.includes('response.json().catch'),false);
});
test('calculator delegates payload to shared CAPTCHA sender and requires sent acknowledgment',async()=>{
  const calls=[],payload={apartment:'Новостройка',area:58,level:'comfort',phone:'test'};
  const send=fixture({send:async (...args)=>{calls.push(args);return {status:'sent'};}});
  const result=await send(payload);
  assert.equal(result.status,'sent');assert.equal(calls.length,1);assert.equal(calls[0][1],payload);
});
test('unconfirmed delivery never reaches calculator success',async()=>{
  for(const result of [null,undefined,{}, {status:'accepted'}, {status:'preview'}]) {
    await assert.rejects(fixture({send:async()=>result})({}),/not confirmed/);
  }
});
test('CAPTCHA, network and backend errors propagate without optimistic success',async()=>{
  for(const message of ['Protection unavailable','HTTP 400','HTTP 502','network error']) {
    await assert.rejects(fixture({send:async()=>{throw Error(message);}})({}),new RegExp(message));
  }
});
test('preview never sends a production request and missing endpoint fails closed',async()=>{
  let calls=0;const sender=async()=>{calls++;return {status:'sent'};};
  assert.equal((await fixture({send:sender,local:true})({})).status,'preview');
  await assert.rejects(fixture({send:sender,endpoint:''})({}),/not configured/);
  assert.equal(calls,0);
});
