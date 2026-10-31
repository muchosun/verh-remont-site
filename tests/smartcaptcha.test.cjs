const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function adapter({failure,scriptFailure=false}={}){
  const renders=[],destroyed=[],listeners={},tokens=[];let count=0;
  const window={};
  const document={createElement:()=>({remove(){}}),body:{append(){}},head:{append(script){setImmediate(()=>scriptFailure?script.onerror():window.verhSmartCaptchaLoaded());}}};
  const smart={render(_e,options){renders.push(options);return ++count;},destroy:id=>destroyed.push(id),subscribe:(id,event,fn)=>{listeners[id+':'+event]=fn;return ()=>{};},execute(id){setImmediate(()=>failure?listeners[id+':'+failure]():renders[id-1].callback('one-use-'+id));}};
  if(!scriptFailure)window.smartCaptcha=smart;
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/smartcaptcha.js'),'utf8'),{window,document,setTimeout,clearTimeout,Error,Promise});
  return {api:window.VerhSmartCaptcha,renders,destroyed,tokens};
}
test('invisible adapter executes a fresh one-use widget for each request, retaining privacy badge',async()=>{
  const f=adapter();assert.equal(await f.api.getToken(),'one-use-1');assert.equal(await f.api.getToken(),'one-use-2');
  assert.deepEqual(f.destroyed,[1,2]);assert(f.renders.every(o=>o.invisible===true&&o.hideShield===false&&o.test===undefined&&o.hl==='ru'));
});
for(const event of ['network-error','javascript-error','token-expired','challenge-hidden'])test('adapter rejects '+event+' without a token',async()=>{
  const f=adapter({failure:event});await assert.rejects(f.api.getToken());assert.deepEqual(f.destroyed,[1]);
});
test('unavailable Yandex script rejects instead of bypassing CAPTCHA',async()=>{const f=adapter({scriptFailure:true});await assert.rejects(f.api.getToken());});

function sender(file,{body,tokenFailure=false,httpFailure=false}={}){
  const posts=[],goals=[];let tokens=0;
  const storage=new Map();
  const window={VerhSmartCaptcha:{mode:'smartcaptcha-v1',getToken:async()=>{tokens++;if(tokenFailure)throw Error('not verified');return 'new-token-'+tokens;}},ym:(_id,method,x)=>method==='getClientID'?x(''):goals.push(x)};
  const context={window,document:{querySelectorAll:()=>[]},location:new URL('https://verhremont.ru/design/?utm_source=qa'),URL,AbortController,setTimeout,clearTimeout,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async(_u,o)=>{posts.push(JSON.parse(o.body));return {ok:!httpFailure,status:502,json:async()=>body||({status:'accepted',verification:'smartcaptcha',intakeMode:'smartcaptcha-v1',formType:'repair_main',leadId:'unit-lead',duplicate:false,qualification:'design_brief_v3'})};}};
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);return {api:window.VerhLead,posts,goals,tokens:()=>tokens};
}
for(const file of ['assets/js/lead-support.js','design/assets/js/lead-support.js']){
  test(file+': requires the verified server receipt after a fresh CAPTCHA',async()=>{
    const f=sender(file);assert.equal(f.api.unverifiedMode,false);
    const a=await f.api.send('/lead',{});await f.api.send('/lead',{});
    assert.equal(a.status,'sent');assert.equal(a.qualification,'design_brief_v3');assert.equal(f.tokens(),2);
    assert.equal(f.posts[0].smartCaptchaToken,'new-token-1');assert.equal(f.posts[1].smartCaptchaToken,'new-token-2');assert.equal(f.posts[0].intakeMode,'smartcaptcha-v1');assert.equal(f.posts[0].turnstileToken,undefined);assert.deepEqual(f.goals,[]);
  });
  test(file+': rejects unverified, malformed and optimistic receipts',async()=>{
    for(const body of [{},{status:'accepted',leadId:'x'},{status:'accepted_unverified',leadId:'x',qualification:'unverified'},{status:'accepted',verification:'smartcaptcha',intakeMode:'smartcaptcha-v1',leadId:'x'}])await assert.rejects(sender(file,{body}).api.send('/lead',{}));
    const f=sender(file,{tokenFailure:true});await assert.rejects(f.api.send('/lead',{}));assert.equal(f.posts.length,0);
    await assert.rejects(sender(file,{httpFailure:true}).api.send('/lead',{}));
  });
  test(file+': preserves duplicate flag without emitting a success goal',async()=>{
    const f=sender(file,{body:{status:'accepted',verification:'smartcaptcha',intakeMode:'smartcaptcha-v1',leadId:'x',duplicate:true}});
    assert.equal((await f.api.send('/lead',{})).duplicate,true);assert.deepEqual(f.goals,[]);
  });
}
test('all current form pages load SmartCaptcha before the sender; design does not gate on Cloudflare',()=>{
  const pages=['index.html','design/index.html','raschet-remonta/index.html',...['priemka-kvartiry','ukladka-laminata','pokleyka-oboev','shpaklevka-sten','ukladka-plitki','razvodka-santehniki','natyazhnoy-potolok'].map(s=>'uslugi/'+s+'/index.html')];
  for(const page of pages){const s=fs.readFileSync(path.join(root,page),'utf8');assert(s.indexOf('/assets/js/smartcaptcha.js?')<s.indexOf('lead-support.js?'));assert(s.includes('20261031-smartcaptcha'));}
  const s=fs.readFileSync(path.join(root,'design/quiz.js'),'utf8');assert.match(s,/local \|\| unverifiedMode \|\| smartMode/);assert.match(s,/!unverified && !delivery\.duplicate/);
});
