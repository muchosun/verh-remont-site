const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname,'../assets/js/main-analytics.js'),'utf8');
const script = fs.readFileSync(path.join(__dirname,'../script.js'),'utf8');
function fixture({preview=false,hostname='verhremont.ru',protocol='https:',designLink='/design/?city=krasnodar'}={}) {
  const goals=[],events={},sections=[{id:'top'},{id:'tariffs'}];
  const node = extra => ({dataset:{},events:{},closest:()=>null,addEventListener(name,fn){this.events[name]=fn;},...extra});
  const link = raw => node({getAttribute:()=>raw,closest:s=>s==='section[id]'?{id:'contacts'}:null});
  const links=[link('tel:+79182383059'),link('https://max.ru/id234207648329_biz'),link('/uslugi/ukladka-laminata/?utm_source=qa'),link('#tariffs'),link('/privacy.html'),link(designLink)];
  const filter=node({dataset:{projectFilter:'comfort'}}),gallery=node({scrollLeft:0});
  let observer;
  const document={addEventListener:(name,fn)=>events[name]=fn,querySelector:()=>gallery,querySelectorAll:s=>({'a[href]':links,'[data-project-filter]':[filter],'main section[id]':sections})[s] || []};
  const window={VERH_PREVIEW:preview,ym:(id,method,name,params)=>goals.push({id,method,name,params})};
  class IntersectionObserver {constructor(fn){this.fn=fn;this.removed=[];observer=this;}observe(){}unobserve(el){this.removed.push(el);}}
  const context={window,document,URL,location:{hostname,protocol,origin:'https://verhremont.ru',href:'https://verhremont.ru/'},IntersectionObserver};
  vm.runInNewContext(code,context);
  return {window,goals,events,links,filter,gallery,sections,observer,context};
}
test('loads once and records main landing, not a conversion',()=>{
  const f=fixture();vm.runInNewContext(code,f.context);assert.equal(f.goals.length,1);assert.equal(f.goals[0].name,'main_landing_view');assert.equal(f.goals[0].params.landing,'repair_main');
});
test('preview and file/localhost never emit diagnostics or paid goals',()=>{
  for(const options of [{preview:true},{protocol:'file:'},{hostname:'localhost'},{hostname:'127.0.0.1'}]){const f=fixture(options);f.window.VerhMainAnalytics.track('quiz_lead_success');f.links[1].events.click();assert.equal(f.goals.length,0);}
});
test('allowlist strips phone, text, URL, area and arbitrary values',()=>{
  const f=fixture();f.window.VerhMainAnalytics.track('quiz_submit_attempt',{phone:'+79012345678',task:'private',area:58,source:'https://private.invalid',tariff:'comfort',apartment:'Вторичка',placement:'hero',field:'private'});
  assert.deepEqual(JSON.parse(JSON.stringify(f.goals.at(-1).params)),{landing:'repair_main',tariff:'comfort',apartment_type:'resale',placement:'hero'});
  f.window.VerhMainAnalytics.track('arbitrary');assert.equal(f.goals.length,2);
});
test('telephone clicks do not synthesize paid delivery or duplicate existing phone goals',()=>{
  const f=fixture();f.links[0].events.click();assert.equal(f.goals.length,1);
  f.links[1].events.click();assert.equal(f.goals.at(-1).name,'main_messenger_click');assert.equal(f.goals.at(-1).params.channel,'max');
});
test('service, anchor and legal links have bounded identifiers',()=>{
  const f=fixture();for(const link of f.links.slice(2))link.events.click();
  assert.equal(f.goals[1].params.service,'ukladka-laminata');assert.equal(f.goals[2].params.control,'tariffs');assert.equal(f.goals[3].params.control,'privacy');
});
test('native invalid field is captured before submit, without its value',()=>{
  const f=fixture();f.events.invalid({target:{name:'personal_data_consent',value:'private',closest:()=>({id:'lead-form'})}});
  assert.equal(f.goals.at(-1).name,'main_validation_error');assert.equal(f.goals.at(-1).params.field,'consent');assert.equal(f.goals.at(-1).params.step,4);assert.equal(JSON.stringify(f.goals).includes('private'),false);
});
test('current and legacy design links retain service analytics without paid goals',()=>{
  for(const designLink of ['/design/?city=krasnodar','/design','/uslugi/dizayn-proekt/']){
    const f=fixture({designLink});f.links.at(-1).events.click();
    assert.equal(f.goals.at(-1).name,'main_service_click');
    assert.equal(f.goals.at(-1).params.service,'dizayn-proekt');
    assert.equal(f.goals.some(x=>x.name==='quiz_lead_success'),false);
  }
});
test('section views deduplicate; project filter and scroll are diagnostics only',()=>{
  const f=fixture();f.observer.fn([{target:f.sections[1],isIntersecting:true}]);f.observer.fn([{target:f.sections[1],isIntersecting:true}]);
  assert.equal(f.goals.filter(x=>x.name==='main_section_view').length,1);
  f.filter.events.click();f.gallery.scrollLeft=80;f.gallery.events.scroll();f.gallery.events.scroll();assert.equal(f.goals.filter(x=>x.params.action==='project_scroll').length,1);assert.equal(f.goals.some(x=>x.name==='quiz_lead_success'),false);
});
test('tracking outage cannot affect page controls or delivered lead state',()=>{
  const f=fixture();f.window.ym=()=>{throw Error('offline');};assert.doesNotThrow(()=>f.links[1].events.click());
  const fn=script.slice(script.indexOf('function trackMetricGoal('),script.indexOf('\ntrackMetricGoal("hero_headline_exposure")'));
  vm.runInNewContext(fn+'\ntrackMetricGoal("quiz_lead_success");',{window:{ym:()=>{throw Error('offline');}},location:{protocol:'https:',hostname:'verhremont.ru'}});
});
test('delivery goal remains inside confirmed delivery branch; step/close hooks do not emit it',()=>{
  const success=script.indexOf('trackMetricGoal(delivery.status === "sent" ? "quiz_lead_success"');
  assert.ok(success>script.indexOf('const [delivery] = await Promise.all'));
  const hooks=script.slice(script.indexOf('function closeQuiz()'),script.indexOf('function setArea('));
  assert.equal(hooks.includes('"quiz_lead_success"'),false);
  assert.match(script,/main_quiz_contact/);assert.match(script,/main_quiz_close/);
});
