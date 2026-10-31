const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const validation = require('../design/brief-validation-v3');

function fixture() {
  const goals = [], posts = [];
  const node = (value = '') => ({value, textContent:'', dataset:{}, hidden:false, disabled:false, checked:false, events:{},
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); },
    emit(name, event = {}) { for (const fn of this.events[name] || []) fn(event); },
    click() { this.emit('click'); }, dispatchEvent(event) { this.emit(event.type, event); },
    setAttribute() {}, removeAttribute() {}, focus() {}, scrollIntoView() {}, closest() { return null; },
  });
  const legends = [node(), node(), node()]; legends[2].textContent = 'Куда вам позвонить';
  const steps = legends.map((legend,i) => ({...node(),dataset:{quizStep:String(i)},querySelector:() => legend}));
  const fields = {};
  for (const name of ['leadMode','customerName','phone','callbackTime','city','area','package','projectStart','projectTask','consent','website']) {
    fields[name] = {...node(),name,closest:selector => selector === '[data-quiz-step]' ? steps[['city','area'].includes(name)?0:['package','projectStart','projectTask'].includes(name)?1:2] : null};
  }
  fields.leadMode.value = 'brief';
  const selectors = ['[data-form-status]','[data-quiz-next]','[data-quiz-back]','[type="submit"]','[data-quiz-mode]','[data-captcha-retry]','[data-quiz-progress]','[data-quiz-counter]','progress','[data-quiz-summary]','[data-form-estimate]'];
  const nodes = Object.fromEntries(selectors.map(selector => [selector,node()]));
  const form = {...node(),elements:fields,querySelector:selector=>nodes[selector],querySelectorAll:selector=>selector==='[data-quiz-step]'?steps:Object.values(fields)};
  const lead = node(), title = node(), description = node(); title.textContent='Полная анкета'; description.textContent='Подробности проекта';
  const header = node(), hero = node(), calculator = node(); header.dataset.leadMode='callback'; calculator.dataset.package='Рабочий проект — 500 ₽/м², от 30 м², договор до 31 октября 2026';
  header.closest = selector => selector === '.preview-header' ? {} : null;
  const document = {querySelector:selector=>selector.startsWith('[data-service-form]')?form:({'#lead':lead,'[data-lead-title]':title,'[data-lead-description]':description}[selector]||null),querySelectorAll:selector=>selector==='[data-scroll-lead]'?[header,hero,calculator]:[]};
  const window = {ym:(_id,method,name,params)=>goals.push({method,name,params}),VerhQuizValidation:validation,VerhLead:{unverifiedMode:true,source:()=>new URL('https://verhremont.ru/design/?utm_source=qa'),send:async(_endpoint,payload)=>{posts.push(payload);return {status:'unverified',formType:payload.designBrief.mode==='callback'?'design_callback':'design_brief'};}},VERH_LEAD_ENDPOINT:'https://unit.invalid'};
  const context={window,document,location:{hostname:'verhremont.ru',protocol:'https:'},URL,Event:class {constructor(type){this.type=type;}},setTimeout,clearTimeout};
  for (const file of ['analytics.js','quiz.js']) vm.runInNewContext(fs.readFileSync(path.join(root,'design',file),'utf8'),context);
  const input=(field,value)=>{fields[field].value=value;form.emit('input',{target:fields[field]});};
  const send=()=>form.emit('submit',{preventDefault(){}});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  return {goals,posts,fields,nodes,steps,lead,title,description,header,hero,calculator,input,send,flush};
}

test('header and sticky consultation CTAs keep the original full questionnaire CTAs separate',()=>{
  const html=fs.readFileSync(path.join(root,'design/index.html'),'utf8');
  const buttons=[...html.matchAll(/<button\b([^>]*)data-scroll-lead([^>]*)>([\s\S]*?)<\/button>/g)];
  const consultation=buttons.filter(m=>/data-lead-mode="callback"/.test(m[0]));
  assert.equal(consultation.length,2);
  assert(consultation.every(m=>m[3].includes('Обсудить проект')));
  assert(buttons.some(m=>m[3].includes('Зафиксировать цену')&&!m[0].includes('data-lead-mode')));
  assert(buttons.some(m=>m[0].includes('data-estimate-continue')&&!m[0].includes('data-lead-mode')));
});
test('consultation opens only phone/contact fields, without area, quote, progress or a misleading Back button',()=>{
  const f=fixture();f.header.click();
  assert.equal(f.fields.leadMode.value,'callback');
  assert.deepEqual(f.steps.map(step=>step.hidden),[true,true,false]);
  for(const selector of ['[data-quiz-progress]','[data-form-estimate]','[data-quiz-next]','[data-quiz-back]'])assert.equal(f.nodes[selector].hidden,true);
  assert.equal(f.nodes['[type="submit"]'].hidden,false);
  assert.equal(f.nodes['[type="submit"]'].textContent,'Получить консультацию');
  assert.equal(f.fields.area.value,'');assert.equal(f.fields.city.value,'');
  assert.equal(f.lead.dataset.leadMode,'callback');assert.match(f.title.textContent,/Обсудим/);
});
test('consultation requires phone and consent but can send with all apartment and project fields empty',async()=>{
  const f=fixture();f.header.click();f.send();await f.flush();assert.equal(f.posts.length,0);
  f.input('phone','+79012345678');f.send();await f.flush();assert.equal(f.posts.length,0);
  f.fields.consent.checked=true;f.send();await f.flush();
  assert.equal(f.posts.length,1);assert.equal(f.posts[0].designBrief.mode,'callback');
  assert.equal(f.posts[0].designBrief.area,undefined);assert.equal(f.posts[0].designBrief.package,undefined);
  assert.equal(f.goals.some(g=>g.name==='design_project_brief_delivered'),false);
});
test('consultation input does not create a full-brief start and is deduplicated separately',()=>{
  const f=fixture();f.header.click();f.input('phone','9');f.input('phone','90');
  assert.equal(f.goals.some(g=>g.name==='design_quiz_start'),false);
  assert.equal(f.goals.filter(g=>g.name==='design_interaction'&&g.params.design_landing.action==='consultation_start').length,1);
  const cta=f.goals.find(g=>g.name==='design_cta_click');assert.equal(cta.params.design_landing.mode,'callback');
  assert(!JSON.stringify(f.goals).includes('+79012345678'));
});
test('switching to the full questionnaire restores area requirements and records its own start',()=>{
  const f=fixture();f.header.click();f.input('phone','9');f.nodes['[data-quiz-mode]'].click();
  assert.equal(f.fields.leadMode.value,'brief');assert.equal(f.steps[0].hidden,false);
  assert.equal(f.nodes['[data-quiz-progress]'].hidden,false);assert.equal(f.nodes['[data-form-estimate]'].hidden,false);
  assert.equal(f.title.textContent,'Полная анкета');
  f.nodes['[data-quiz-next]'].click();assert.equal(f.steps[0].hidden,false);
  f.input('city','Москва');f.input('area','45');f.nodes['[data-quiz-next]'].click();
  assert.equal(f.steps[1].hidden,false);assert.equal(f.goals.filter(g=>g.name==='design_quiz_start').length,1);
  assert.equal(f.goals.filter(g=>g.name==='design_step_apartment').length,1);
});
test('hero and calculator leave callback mode, preserve a draft and open the full questionnaire',()=>{
  for(const control of ['hero','calculator']){
    const f=fixture();f.fields.city.value='Москва';f.fields.area.value='45';f.header.click();f[control].click();
    assert.equal(f.fields.leadMode.value,'brief');assert.equal(f.steps[0].hidden,false);
    assert.equal(f.fields.area.value,'45');assert.equal(f.fields.city.value,'Москва');
    if(control==='calculator')assert.match(f.fields.package.value,/Рабочий проект/);
  }
});
test('hidden spam field still blocks consultation sending',async()=>{
  const f=fixture();f.header.click();f.fields.phone.value='+79012345678';f.fields.consent.checked=true;f.fields.website.value='bot.invalid';
  f.send();await f.flush();assert.equal(f.posts.length,0);
});
