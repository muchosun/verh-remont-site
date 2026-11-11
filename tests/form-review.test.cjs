const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const Inputmask=require('../assets/vendor/inputmask-5.0.9.min').default;
const phone=require('../assets/js/phone-input');
test('ready-made phone mask handles national, international and Russian trunk-prefix paste',()=>{
  for(const value of ['9012345678','79012345678','89012345678','+7 (901) 234-56-78','8 (901) 234-56-78']){
    assert.equal(Inputmask.format(value,phone.options()),'+7 (901) 234-56-78');
  }
  assert.equal(phone.national('+7 '),'');
  assert.equal(Inputmask.isValid('+7 (901) 234-56-78',phone.options()),true);
  assert.equal(Inputmask.isValid('+7 (901) 234-56-7',phone.options()),false);
});
test('all active form pages load a local mask, without a remote dependency or automatic submission',()=>{
  const pages=['index.html','remont-kvartir/index.html','raschet-remonta/index.html','design/index.html',...['priemka-kvartiry','ukladka-laminata','pokleyka-oboev','shpaklevka-sten','ukladka-plitki','razvodka-santehniki','natyazhnoy-potolok'].map(s=>'uslugi/'+s+'/index.html')];
  for(const page of pages){const html=read(page);assert.match(html,/assets\/vendor\/inputmask-5\.0\.9\.min\.js/);assert.match(html,/assets\/js\/phone-input\.js/);}
  assert.doesNotMatch(read('assets/js/phone-input.js'),/fetch\(|reachGoal|\.submit\(|requestSubmit|XMLHttpRequest/);
});
test('main final copy is preserved when the quiz is reset and gift conditions remain explicit',()=>{
  for(const file of ['index.html','script.js'])assert.match(read(file),/Зафиксируйте стоимость вашего ремонта/);
  const html=read('index.html');assert.match(html,/Что вы получаете/);assert.match(html,/«Комфорте» от 50 м²/);assert.match(html,/После бесплатного замера/);
});
test('design purpose and optional preferences survive both frontend and server validation',()=>{
  const client=require('../design/brief-validation-v3');
  const server=require('../../design-quiz-turnstile-20261025/backend/brief-validation-v3');
  const base={mode:'brief',city:'Краснодар',area:60,package:'Рабочий проект — 500 ₽/м², от 30 м²',phone:'+79012345678',consent:true,projectTask:''};
  for(const purpose of ['','Для собственного проживания','Для сдачи в аренду или продажи','Коммерческая недвижимость']){
    const result=client.validate({...base,projectPurpose:purpose});assert(result.ok);assert.equal(result.values.projectPurpose,purpose);assert.equal(result.values.projectStart,'');assert.deepEqual(result,server.validate({...base,projectPurpose:purpose}));
  }
  assert.equal(client.validate({...base,projectPurpose:'unsupported'}).field,'projectPurpose');
  assert.equal(client.validate({...base,consent:false}).field,'consent');
  assert.equal(client.validate({...base,projectTask:'x'.repeat(601)}).field,'projectTask');
});
test('default consent remains a changeable checkbox and is still required by submission validation',()=>{
  for(const p of ['raschet-remonta/index.html','design/index.html'])assert.match(read(p),/<input[^>]*type="checkbox"[^>]*checked[^>]*required/);
  assert.match(read('remont-kvartir/quiz.js'),/consent:true/);assert.match(read('remont-kvartir/quiz.js'),/if\(!state.consent\)/);
});
