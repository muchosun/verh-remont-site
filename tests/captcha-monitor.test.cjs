const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function fixture(file,{outcome='passed',failSave=false,duplicate=false,updateOverride={}}={}) {
  const calls=[],analytics=[],jobs=[],widgets=[],listeners={};
  let destroyed=0;
  const window={ym:(_id,method,...args)=>method==='getClientID'?args[0](''):analytics.push({method,args})};
  window.smartCaptcha={render(_c,o){widgets.push(o);return 1;},destroy(){destroyed++;},subscribe(_id,e,fn){listeners[e]=fn;},execute(){queueMicrotask(()=>outcome==='passed'?widgets[0].callback('unit-token'):listeners[outcome==='cancelled'?'challenge-hidden':'network-error']());}};
  const receipt={status:'accepted_unverified',qualification:'unverified',intakeMode:'smartcaptcha-monitor-v1',paidGoal:false,leadId:'unit-id',formType:file.startsWith('design/')?'design_brief':'repair_main',duplicate,receipt:'unit-receipt'};
  const context={window,document:{createElement:()=>({remove(){}}),body:{append(){}},querySelectorAll:()=>[]},location:new URL('https://verhremont.ru/design/?utm_source=qa'),URL,AbortController,sessionStorage:{getItem(){return null;},setItem(){}},
    setTimeout:(fn,ms)=>ms===0?(jobs.push(fn),0):setTimeout(fn,ms),clearTimeout,
    fetch:async(_u,o)=>{const body=JSON.parse(o.body);calls.push(body);if(failSave)throw Error('private');return {ok:true,json:async()=>body.phase==='result'?{status:'monitor_updated',paidGoal:outcome==='passed',captchaStatus:outcome,formType:receipt.formType,leadId:receipt.leadId,goalPolicy:'verified-goals-v1',verification:outcome==='passed'?'smartcaptcha':'unverified',duplicate:false,successGoals:outcome==='passed'?(receipt.formType==='design_brief'?['design_project_brief_delivered','service_lead_success']:['quiz_lead_success']):[],...updateOverride}:receipt};}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/smartcaptcha.js'),'utf8'),context);
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  const run=async()=>{jobs.forEach(fn=>fn());await new Promise(r=>setTimeout(r,outcome==='cancelled'?550:30));};
  return {api:window.VerhLead,calls,analytics,widgets,jobs,run,destroyed:()=>destroyed};
}
for(const file of ['assets/js/lead-support.js','design/assets/js/lead-support.js']) {
  for(const outcome of ['passed','cancelled','unavailable'])test(file+': '+outcome+' saves before challenge; restores goals only after verified result',async()=>{
    const f=fixture(file,{outcome});assert.equal(f.api.unverifiedMode,true);
    const a=await f.api.send('/lead',{phone:'unit-phone',kind:'callback',source:'https://verhremont.ru/'});
    assert.equal(a.status,'unverified');assert.equal(f.calls.length,1);assert.equal(f.widgets.length,0);assert.equal(f.calls[0].smartCaptchaToken,undefined);assert.equal(f.calls[0].intakeMode,'smartcaptcha-monitor-v1');
    await f.run();assert.equal(f.calls.length,2);assert.equal(f.calls[1].phase,'result');assert.equal(f.calls[1].phone,undefined);assert.equal(f.calls[1].source,undefined);assert.equal(f.calls[1].receipt,'unit-receipt');assert.equal(f.destroyed(),1);
    const goals=f.analytics.filter(x=>x.method==='reachGoal').map(x=>x.args[0]);const expected=['unverified_'+a.formType+'_delivered',...(outcome==='passed'?(a.formType==='design_brief'?['design_project_brief_delivered','service_lead_success']:['quiz_lead_success']):[])];assert.deepEqual(goals,expected);
    const statuses=f.analytics.filter(x=>x.method==='params').map(x=>x.args[0].captcha_monitor.status);assert.deepEqual(statuses,['pending',outcome]);assert(!JSON.stringify(f.analytics).includes('unit-phone'));assert(!JSON.stringify(f.analytics).includes('unit-token'));assert(!JSON.stringify(f.analytics).includes('unit-receipt'));
  });
  test(file+': failure to save cannot claim success or start CAPTCHA',async()=>{const f=fixture(file,{failSave:true});await assert.rejects(f.api.send('/lead',{}));assert.equal(f.widgets.length,0);assert.equal(f.analytics.length,0);});
  test(file+': duplicate does not repeat goals or CAPTCHA',async()=>{const f=fixture(file,{duplicate:true});assert.equal((await f.api.send('/lead',{})).duplicate,true);assert.equal(f.jobs.length,0);assert.equal(f.analytics.length,0);});
  for(const updateOverride of [{verification:'unverified'},{leadId:'another'},{successGoals:['quiz_lead_success','design_project_brief_delivered']},{duplicate:true},{goalPolicy:'unexpected'}])test(file+': malformed, mismatched or repeated update never triggers a success goal '+JSON.stringify(updateOverride),async()=>{
    const f=fixture(file,{updateOverride});const a=await f.api.send('/lead',{});await f.run();assert.deepEqual(f.analytics.filter(x=>x.method==='reachGoal').map(x=>x.args[0]),['unverified_'+a.formType+'_delivered']);
  });
}
