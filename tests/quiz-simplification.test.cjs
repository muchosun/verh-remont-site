const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('callback opens only after explicit interaction, never a timer',()=>{
 const js=read('script.js');assert.doesNotMatch(js,/scheduleCallbackPrompt|callbackPromptDelay|callbackTimerId/);
 assert.match(js,/\[data-callback-open\]/);assert.match(read('index.html'),/data-callback-open>Заказать звонок/);
 const calls=[...js.matchAll(/showCallbackPrompt\(\);/g)];assert.equal(calls.length,1);
});
test('reference standard route contains six steps, preserving conditional rejection and back tracking',()=>{
 const js=read('remont-kvartir/quiz.js'),c={};
 vm.runInNewContext(js.slice(js.indexOf('const steps='),js.indexOf('const state='))+js.slice(js.indexOf('function nextStepIndex('),js.indexOf('function fail('))+'this.steps=steps;',c);
 const route=[];let i=0;while(i<c.steps.length){route.push(c.steps[i].id);i=c.nextStepIndex(i,{scope:'full'});}
 assert.deepEqual(route,['city','property','dimensions','repair','scope','contact']);
 assert.match(js,/state\.history\.pop\(\)/);assert.match(js,/form\.elements\.rooms\?\.value\|\|''/);
 assert.match(js,/state\.answers\.channels=\[form\.elements\.channel\.value\]/);
 assert.match(js,/data-area-choice/);assert.doesNotMatch(js,/track\(['"](?:repair|design)_interest_manager_confirmed/);
});
test('design no longer requires a start date, without inventing area, package or consent',()=>{
 const {validate}=require('../design/brief-validation-v3');
 const b={mode:'brief',city:'Краснодар',area:40,package:'Рабочий проект — 500 ₽/м², от 30 м²',projectStart:'Пока не решил',projectTask:''};
 assert.equal(validate(b,1).ok,true);
  assert.equal(validate({...b,area:''},1).field,'area');assert.equal(validate({...b,projectStart:''},1).ok,true);
  assert.doesNotMatch(read('design/index.html'),/name="projectStart"|Тишина в деталях|У каждой квартиры|Зафиксировать цену/);
});
