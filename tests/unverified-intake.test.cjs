const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const types=['repair_main','repair_callback','repair_calculator','design_brief','design_callback',...['priemka_kvartiry','ukladka_laminata','pokleyka_oboev','shpaklevka_sten','ukladka_plitki','razvodka_santehniki','natyazhnoy_potolok'].map(x=>'service_'+x)];
function fixture(file,type,{duplicate=false,body,fail=false,blockedStorage=false}={}){
  const goals=[],posts=[];const storage=new Map();
  const window={ym:(_id,method,value)=>{if(method==='getClientID')value('');else goals.push(value);},VerhCaptcha:{getToken:async()=>{throw Error('CAPTCHA must not execute');}}};
  const context={window,URL,location:new URL('https://verhremont.ru/design/?utm_source=qa'),AbortController,setTimeout,clearTimeout,document:{querySelectorAll:()=>[]},sessionStorage:{getItem:k=>{if(blockedStorage)throw Error('blocked');return storage.get(k)||null;},setItem:(k,v)=>storage.set(k,v)},fetch:async(_url,options)=>{posts.push(JSON.parse(options.body));if(fail)throw Error('offline');return {ok:true,json:async()=>body||({status:'accepted_unverified',qualification:'unverified',intakeMode:'unverified-all-v1',leadId:'test-id',formType:type,duplicate})};}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);return {api:window.VerhLead,goals,posts};
}
for(const type of types)test('only technical goal for confirmed '+type,async()=>{
  const f=fixture('assets/js/lead-support.js',type);const result=await f.api.send('/lead',{phone:'test',turnstileToken:'must-not-leak'});assert.equal(result.status,'unverified');assert.deepEqual(f.goals,['unverified_'+type+'_delivered']);assert.equal(f.posts[0].intakeMode,'unverified-all-v1');assert.equal('turnstileToken' in f.posts[0],false);await f.api.send('/lead',{});assert.equal(f.goals.length,1);
});
for(const type of ['design_brief','design_callback'])test('design helper confirms '+type+' without paid goals',async()=>{
  const f=fixture('design/assets/js/lead-support.js',type);assert.equal((await f.api.send('/lead',{})).status,'unverified');assert.deepEqual(f.goals,['unverified_'+type+'_delivered']);
});
test('duplicates never add another technical goal',async()=>{const f=fixture('assets/js/lead-support.js','repair_main',{duplicate:true});await f.api.send('/lead',{});assert.deepEqual(f.goals,[]);});
test('HTTP success alone and verified legacy receipt cannot confirm temporary intake',async()=>{for(const body of [{},{status:'accepted',leadId:'x'},{status:'accepted_unverified',leadId:'x'},{status:'accepted_unverified',leadId:'x',intakeMode:'unverified-all-v1',qualification:'unverified',formType:'forged'}]){const f=fixture('assets/js/lead-support.js','repair_main',{body});await assert.rejects(f.api.send('/lead',{}));assert.deepEqual(f.goals,[]);}});
test('network failure and blocked storage cannot create a paid goal or optimistic receipt',async()=>{const f=fixture('assets/js/lead-support.js','repair_main',{fail:true});await assert.rejects(f.api.send('/lead',{}));assert.deepEqual(f.goals,[]);const blocked=fixture('assets/js/lead-support.js','repair_main',{blockedStorage:true});assert.equal((await blocked.api.send('/lead',{})).status,'unverified');assert.deepEqual(blocked.goals,['unverified_repair_main_delivered']);});
test('temporary design mode removes token gating but keeps validation and honeypot',()=>{const s=fs.readFileSync(path.join(__dirname,'../design/quiz.js'),'utf8');assert.match(s,/local \|\| unverifiedMode/);assert.match(s,/validate\(collect\(\)\)/);assert.match(s,/form\.elements\.website\.value\.trim\(\)/);assert.match(s,/if \(!unverified && !delivery\.duplicate\) \{/);});
