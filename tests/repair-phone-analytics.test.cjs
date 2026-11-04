const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/repair-phone-analytics.js'),'utf8');
function fixture({preview=false,pathname='/',late=false,phoneLast=false}={}) {
  const goals=[],inputEvents={},formEvents={},windowEvents={},timers=[];
  const input={value:'+7 ',closest:()=>null,addEventListener:(name,fn)=>inputEvents[name]=fn};
  const form={dataset:{phoneFlow:phoneLast?'phone_last':undefined},querySelector:()=>input,addEventListener:(name,fn)=>formEvents[name]=fn};
  const collect=(id,method,name,params)=>goals.push({id,method,name,params});
  const window={VERH_PREVIEW:preview,ym:late?undefined:collect,addEventListener:(name,fn)=>windowEvents[name]=fn};
  vm.runInNewContext(source,{window,document:{querySelector:()=>form},location:{protocol:'https:',hostname:'verhremont.ru',pathname},setTimeout:fn=>{timers.push(fn);return timers.length;}});
  return {api:window.VerhRepairPhoneAnalytics,window,collect,goals,input,timers,inputEvents,formEvents,windowEvents};
}
test('view and prefix do not pretend that the client started entering a phone',()=>{
  const f=fixture();f.api.view();f.api.view();f.inputEvents.input({isTrusted:true});
  assert.deepEqual(f.goals.map(g=>g.name),['repair_phone_view']);
  f.api.close();assert.equal(f.goals.at(-1).params.phone_state,'empty');
});
test('real input and full number are separate stages, without the number or its parts',()=>{
  const f=fixture();f.api.view();f.input.value='+7 (901)';f.inputEvents.input({isTrusted:true});
  f.input.value='+7 (901) 234-56-78';f.inputEvents.input({isTrusted:true});f.inputEvents.input({isTrusted:true});
  f.api.continued();f.api.close();f.windowEvents.pagehide();
  assert.deepEqual(f.goals.map(g=>g.name),['repair_phone_view','repair_phone_input_start','repair_phone_valid','repair_phone_continue']);
  assert.doesNotMatch(JSON.stringify(f.goals),/7901|234|56-78|phone-input/);
  assert.equal(f.goals.every(g=>g.params.form==='repair_main'&&g.params.flow==='repair_phone_first_v1'),true);
});
test('pasting a full phone emits start then valid in order; synthetic and hidden inputs do not',()=>{
  const f=fixture();f.input.value='+79012345678';f.inputEvents.input({isTrusted:true});assert.equal(f.goals.length,0);
  f.api.view();f.inputEvents.input({isTrusted:false});assert.equal(f.goals.length,1);
  f.inputEvents.input({isTrusted:true});assert.deepEqual(f.goals.map(g=>g.name),['repair_phone_view','repair_phone_input_start','repair_phone_valid']);
});
test('an explicit +7 and nine national digits are still partial, not a complete phone',()=>{
  const f=fixture();f.api.view();f.input.value='+7 (901) 234-56-7';f.inputEvents.input({isTrusted:true});
  assert.deepEqual(f.goals.map(g=>g.name),['repair_phone_view','repair_phone_input_start']);
  f.api.close();assert.equal(f.goals.at(-1).params.phone_state,'partial');
});
test('partial exit is explicit, reopening starts a new attempt, continuation is not an exit',()=>{
  const f=fixture();f.api.view();f.input.value='+7901';f.inputEvents.input({isTrusted:true});f.api.close();
  assert.equal(f.goals.at(-1).params.phone_state,'partial');f.api.view();assert.equal(f.goals.at(-1).name,'repair_phone_view');
});
test('invalid field records only field category; saved and failed are technical goals',()=>{
  const f=fixture({pathname:'/raschet-remonta/'});f.api.view();
  f.formEvents.invalid({isTrusted:true,target:{name:'personal_data_consent',value:'private'}});f.api.saved();f.api.failed();
  assert.equal(f.goals[1].params.field,'consent');assert.equal(f.goals.every(g=>g.params.form==='repair_calculator'),true);
  assert.deepEqual(f.goals.slice(-2).map(g=>g.name),['repair_draft_saved','repair_draft_failed']);
  assert.doesNotMatch(JSON.stringify(f.goals),/private|quiz_lead_success|calculator_lead_success|design_project_brief_delivered/);
});
test('late Metrika gets queued bounded events; blocked Metrika cannot affect form controls',()=>{
  const f=fixture({late:true});f.api.view();f.window.ym=f.collect;f.timers.shift()();assert.equal(f.goals[0].name,'repair_phone_view');
  f.window.ym=()=>{throw Error('blocked');};assert.doesNotThrow(()=>f.api.saved());
});
test('preview emits neither technical nor paid events',()=>{
  const f=fixture({preview:true});f.api.view();f.input.value='+79012345678';f.inputEvents.input({isTrusted:true});f.api.continued();f.api.saved();f.api.failed();assert.deepEqual(f.goals,[]);
});
test('returning through browser back-forward cache resumes phone-stage tracking',()=>{
  const f=fixture();f.api.view();f.windowEvents.pagehide();f.windowEvents.pageshow({persisted:true});
  f.input.value='+7901';f.inputEvents.input({isTrusted:true});
  assert.deepEqual(f.goals.map(g=>g.name),['repair_phone_view','repair_phone_exit','repair_phone_view','repair_phone_input_start']);
});
test('phone-last completion does not claim continuation to questions or an early draft',()=>{
  const f=fixture({phoneLast:true});f.api.view();f.input.value='+79012345678';f.inputEvents.input({isTrusted:true});f.api.submitted();f.api.close();
  assert.deepEqual(f.goals.map(g=>g.name),['repair_phone_view','repair_phone_input_start','repair_phone_valid']);
  assert.equal(f.goals.every(g=>g.params.flow==='repair_phone_last_v1'),true);
});
