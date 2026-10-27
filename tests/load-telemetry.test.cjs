const test = require('node:test');
const assert = require('node:assert/strict');
const {createHandler,validate} = require('../load-telemetry/index');
const sample = {v:1,page_id:'a'.repeat(32),page:'design',event:'html_started',ms:10,viewport:'mobile',channel:'direct_ads',qa:true};
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname,'../assets/js/load-telemetry.js'),'utf8');
function browser(options={}) {
  const requests=[],events={},timers=[];
  const location={hostname:'verhremont.ru',protocol:'https:',pathname:'/design/',search:'?utm_source=qa&utm_campaign=TEST_LOAD',origin:'https://verhremont.ru',...options.location};
  const window={VERH_PREVIEW:options.preview,crypto:{getRandomValues:bytes=>bytes.fill(1)},addEventListener:(name,fn)=>events[name]=fn};
  const context={window,location,document:{addEventListener:(name,fn)=>events[name]=fn},innerWidth:390,performance:{now:()=>123},setTimeout:fn=>timers.push(fn),fetch:(url,args)=>{if(options.offline)throw Error('offline');requests.push({url,args,body:JSON.parse(args.body)});return Promise.resolve({status:204});},URL,URLSearchParams,Uint8Array};
  vm.runInNewContext(code,context);
  return {window,events,timers,requests,context};
}
const request = body => ({httpMethod:'POST',headers:{Origin:'https://verhremont.ru'},body:JSON.stringify(body)});
test('collector acknowledges and logs only an allowlisted technical envelope',async()=>{
  const logs=[]; const result=await createHandler(x=>logs.push(x))(request(sample));
  assert.equal(result.statusCode,204); assert.equal(logs.length,1); assert.equal(logs[0].message,'verh_load_v1');
  assert.equal(result.headers['Access-Control-Allow-Origin'],'https://verhremont.ru');
});
test('unknown fields including phone, URL, token and text are rejected without logging',async()=>{
  for(const key of ['phone','url','token','text','ip','referrer']){const logs=[];assert.equal((await createHandler(x=>logs.push(x))(request({...sample,[key]:'private'}))).statusCode,400);assert.equal(logs.length,0);}
});
test('schema bounds and unknown events are rejected',()=>{
  for(const extra of [{event:'paid_lead'},{page:'other'},{ms:-1},{ms:120001},{page_id:'x'},{qa:'true'},{viewport:'phone'},{asset:'quiz'},{event:'script_error',asset:'https://private'}]) assert.equal(validate({...sample,...extra}),null);
});
test('foreign origin and malformed or oversized bodies cannot enter the log',async()=>{
  const logs=[],handler=createHandler(x=>logs.push(x));
  assert.equal((await handler({...request(sample),headers:{origin:'https://other.invalid'}})).statusCode,403);
  assert.equal((await handler({...request(sample),body:'{' })).statusCode,400);
  assert.equal((await handler({...request(sample),body:'x'.repeat(1025)})).statusCode,400);
  assert.equal(logs.length,0);
});
test('CORS preflight and healthcheck never record a visit',async()=>{
  const logs=[],handler=createHandler(x=>logs.push(x));
  assert.equal((await handler({...request(sample),httpMethod:'OPTIONS'})).statusCode,204);
  assert.equal((await handler({httpMethod:'GET'})).statusCode,200);
  assert.equal(logs.length,0);
});
test('client records page start with no Metrika and no user data',()=>{
  const f=browser({location:{search:'?utm_source=yandex&utm_medium=cpc&phone=private&projectTask=private'}});
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].body.event,'html_started');assert.equal(f.requests[0].body.channel,'direct_ads');
  assert.equal(JSON.stringify(f.requests).includes('private'),false);assert.equal(f.requests[0].args.credentials,'omit');assert.equal(f.requests[0].args.referrerPolicy,'no-referrer');
  assert.ok(validate(f.requests[0].body));
});
test('form readiness deduplicates and suppresses the timeout',()=>{
  const f=browser();f.window.VerhLoad.mark('form_ready');f.window.VerhLoad.mark('form_ready');f.timers[0]();
  assert.equal(f.requests.filter(x=>x.body.event==='form_ready').length,1);assert.equal(f.requests.some(x=>x.body.event==='form_timeout'),false);
  f.window.VerhLoad.mark('paid_lead');assert.equal(f.requests.length,2);
});
test('missing initialization emits timeout, not false readiness',()=>{
  const f=browser();f.events.DOMContentLoaded();f.timers[0]();assert.deepEqual(f.requests.map(x=>x.body.event),['html_started','dom_ready','form_timeout']);
});
test('tracking failure and unsupported paint observation do not affect controls',()=>{
  const f=browser({offline:true});assert.doesNotThrow(()=>f.window.VerhLoad.mark('form_ready'));assert.doesNotThrow(()=>f.events.load());
});
test('local previews and other hosts remain silent',()=>{
  for(const options of [{preview:true},{location:{hostname:'localhost'}},{location:{protocol:'file:'}},{location:{pathname:'/privacy.html'}}])assert.equal(browser(options).requests.length,0);
});
test('bootstrap is inline before blocking styles; ready hooks follow handler installation',()=>{
  for(const name of ['index.html','design/index.html']){const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');assert.ok(html.indexOf('<!-- load-telemetry:start -->')<html.indexOf('rel="stylesheet"'));assert.ok(html.includes(`<script>${code.trim()}</script>`));}
  const main=fs.readFileSync(path.join(__dirname,'../script.js'),'utf8');const quiz=fs.readFileSync(path.join(__dirname,'../design/quiz.js'),'utf8');
  assert.ok(main.lastIndexOf('VerhLoad')>main.lastIndexOf('leadForm.addEventListener'));
  assert.ok(quiz.lastIndexOf('mark("form_ready")')>quiz.indexOf('form.addEventListener("submit"'));
});
