(() => {
  'use strict';
  const preview=location.protocol==='file:'||['localhost','127.0.0.1'].includes(location.hostname)||window.VERH_PREVIEW;
  const dialog=document.querySelector('#quiz'),form=document.querySelector('#quiz-form'),panel=document.querySelector('#question-panel');
  const error=document.querySelector('#form-error'),result=document.querySelector('#quiz-result'),next=document.querySelector('.next'),back=document.querySelector('.back');
  const progress=document.querySelector('#progress-bar'),progressLabel=document.querySelector('#progress-label');
  const steps=[
    {id:'city',title:'Ремонт нужен в Краснодаре?',options:[['krasnodar','Да, в Краснодаре'],['other','Нет, в другом регионе']]},
    {id:'property',title:'Где нужно сделать ремонт?',options:[['new','Новостройка'],['resale','Вторичное жилье'],['house','Частный дом'],['other','Другое']]},
    {id:'dimensions',title:'Какая примерно площадь?'},
    {id:'repair',title:'Какой ремонт планируете делать?',cards:true,options:[
      ['first','Первый ремонт в новостройке','../v14/assets/web/quiz-newbuild.webp'],
      ['cosmetic','Косметический ремонт','../assets/tariffs/finish-cosmetic.webp'],
      ['capital','Капитальный ремонт','../v14/assets/web/quiz-secondary.webp'],
      ['designer','Дизайнерский ремонт','../assets/projects/lux/lux_03_msg180.webp']]},
    {id:'scope',title:'Какой объем работ потребуется выполнить?',options:[['preclean','Предчистовая отделка'],['full','Отделка всего помещения "под ключ" от черновой отделки до чистовой'],['one','Частичный ремонт одной комнаты'],['several','Частичный ремонт нескольких комнат'],['other','Другое']]},
    {id:'contact',title:'Куда отправить расчёт?',phonePrompt:'За этим номером мы закрепим расчет сметы в трех вариантах с выгодой до 250 000 рублей и подарки'},
  ];
  const state={step:0,history:[],answers:{city:'krasnodar',property:'new',rooms:'',area:'',ceiling:'',repair:'',scope:'full',channels:['phone']},sending:false,submitted:false,phone:'',name:'',consent:true,phoneStarted:false,phoneValid:false};
  let trigger,autoTimer,phoneView=false;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function track(event,params={}){
    if(preview||typeof window.ym!=='function')return;
    const safe={landing:'repair_reference',flow:'reference_quiz_v3'};
    for(const key of ['step','control','action','form','field'])if(typeof params[key]==='string'||Number.isInteger(params[key]))safe[key]=params[key];
    try{window.ym(110859289,'reachGoal',event,safe);}catch{}
  }
  function parseDimensions(areaValue,ceilingValue){
    const areaText=String(areaValue??'').trim(),ceilingText=String(ceilingValue??'').trim();
    if(!/^\d+(?:[.,]\d+)?$/.test(areaText)||ceilingText.length>120)return null;
    const area=Number(areaText.replace(',','.')),ceiling=ceilingText;
    if(!Number.isFinite(area)||area<1||area>1000)return null;
    return{area:Math.round(area*10)/10,ceiling};
  }
  function phoneDigits(value){const text=String(value);let d=text.replace(/\D/g,'');if(/^\s*\+/.test(text)&&!/^\s*\+7/.test(text))return '';if(/^\s*(?:\+7|8[\s(])/.test(text)&&d.length!==11)return '';if(d.length===10)d='7'+d;if(d.length===11&&d.startsWith('8'))d='7'+d.slice(1);return /^7\d{10}$/.test(d)?d:'';}
  function hasPhoneInput(value){const digits=String(value).replace(/\D/g,'');return Boolean(digits&&digits!=='7'&&digits!=='8');}
  function nextStepIndex(index){
    return index+1;
  }
  function fail(message,field){error.textContent=message;error.hidden=false;if(field)field.focus();track('main_validation_error',{step:state.step+1,field:field?.type==='tel'?'phone':field?.type==='checkbox'?'consent':'form'});}
  function clearAuto(){clearTimeout(autoTimer);autoTimer=undefined;}
  function remember(){
    const step=steps[state.step];
    if(step.id==='dimensions'){state.answers.area=form.elements.area?.value||'';state.answers.ceiling=form.elements.ceiling?.value||'';state.answers.rooms=form.elements.rooms?.value||'';}
    if(step.id==='contact'){state.name=form.elements.name?.value||'';state.phone=form.elements.phone?.value||'';state.consent=Boolean(form.elements.personal_data_consent?.checked);state.answers.channels=[form.elements.channel.value];}
  }
  function render(){
    clearAuto();error.hidden=true;
    dialog.setAttribute('aria-labelledby','question-title');
    const step=steps[state.step],number=state.step+1,percentage=Math.round(number/steps.length*100);
    progress.style.width=percentage+'%';progressLabel.textContent=`${number} из ${steps.length}`;
    back.disabled=state.history.length===0||state.sending;next.disabled=state.sending;
    next.querySelector('span').textContent=step.id==='contact'?'Получить расчёт':'Далее';
    panel.innerHTML=`<h2 id="question-title" tabindex="-1">${esc(step.title)}</h2>`;
    if(step.id==='dimensions')panel.insertAdjacentHTML('beforeend',`<div class="contact-fields"><p class="field-note">Можно примерно. Точную площадь уточним на замере.</p><div class="area-presets" aria-label="Примерная площадь">${[28,36,58,78].map(area=>`<button type="button" data-area-choice="${area}">${area} м²</button>`).join('')}</div><label class="text-field">Площадь, м²<input name="area" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="Например, 65" value="${esc(state.answers.area)}" required aria-describedby="area-note" /><span class="field-note" id="area-note">От 1 до 1 000 м².</span></label><details><summary>Комнаты и высота (необязательно)</summary><div class="optional-fields"><label class="text-field">Комнат<select name="rooms">${[['','Не знаю / не указывать'],['1','1'],['2','2'],['3','3'],['4','4 и более']].map(([value,label])=>`<option value="${value}" ${state.answers.rooms===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="text-field">Высота потолков, если знаете<input name="ceiling" autocomplete="off" maxlength="120" placeholder="Например, 2,7 м или не знаю" value="${esc(state.answers.ceiling)}" aria-describedby="ceiling-note" /><span class="field-note" id="ceiling-note">Можно написать в любом удобном формате или пропустить.</span></label></div></details></div>`);
    else if(step.id==='contact'){
      const phonePrompt=['one','several'].includes(state.answers.scope)?'Оставьте номер — обсудим объём работ и подготовим расчёт для вашей задачи.':step.phonePrompt;
      panel.insertAdjacentHTML('beforeend',`<div class="contact-fields"><p class="contact-prompt">${esc(phonePrompt)}</p><label class="text-field">Номер телефона<input name="phone" type="tel" inputmode="tel" autocomplete="tel" aria-label="Телефон для расчёта" placeholder="+7 (___) ___-__-__" maxlength="24" value="${esc(state.phone)}" required /></label><label class="text-field">Как удобнее связаться<select name="channel">${[['phone','Звонок'],['max','MAX'],['telegram','Telegram']].map(([value,label])=>`<option value="${value}" ${state.answers.channels.includes(value)?'selected':''}>${label}</option>`).join('')}</select></label><details><summary>Добавить имя (необязательно)</summary><label class="text-field">Имя<input name="name" autocomplete="given-name" maxlength="60" value="${esc(state.name)}" /></label></details><label class="answer consent"><input type="checkbox" name="personal_data_consent" ${state.consent?'checked':''} required /><span>Я согласен(-на) на <a href="../consent.html" target="_blank" rel="noopener">обработку персональных данных</a></span></label></div><label class="hp" aria-hidden="true">Сайт<input name="website" tabindex="-1" autocomplete="off" /></label>`);
      if(!phoneView){phoneView=true;track('main_quiz_contact',{step:state.step+1});track('repair_phone_view',{form:'repair_reference',step:state.step+1});}
    }else{
      const content=step.options.map(([value,label,image])=>{
        const checked=state.answers[step.id]===value;
        return `<label class="${step.cards?'image-answer':'answer'}"><input type="radio" name="${step.id}" value="${esc(value)}" ${checked?'checked':''} />${image?`<img src="${image}" alt="" width="320" height="400" />`:''}<span>${esc(label)}</span></label>`;
      }).join('');panel.insertAdjacentHTML('beforeend',`<div class="answers ${step.cards?'cards':''}">${content}</div>`);
    }
    track('main_interaction',{action:'step_view',control:step.id,step:state.step+1});
    panel.querySelector('h2').focus({preventScroll:true});dialog.scrollTop=0;
  }
  function rejected(){
    const percentage=9;
    progress.style.width=percentage+'%';progressLabel.textContent=percentage+'%';
    track('main_interaction',{action:'region_rejected',step:state.step+1});form.hidden=true;result.hidden=false;result.classList.add('terminal');
    dialog.setAttribute('aria-labelledby','result-title');
    result.innerHTML='<h2 id="result-title" tabindex="-1">Извините, но мы не сможем вам помочь. Наша компания занимается ремонтом под ключ только в г.Краснодар</h2><p>Заполнение анкеты далее не требуется</p><button type="button" class="primary" data-return-city>Вернуться к выбору города</button>';
    result.querySelector('h2').focus();
  }
  async function advance(){
    if(state.sending||state.submitted)return;clearAuto();remember();
    const step=steps[state.step],answer=state.answers[step.id];
    if(step.id==='city'&&answer==='other'){rejected();return;}
    if(step.options&&(!answer||Array.isArray(answer)&&!answer.length)){fail('Выберите хотя бы один вариант.');return;}
    if(step.id==='dimensions'&&!parseDimensions(state.answers.area,state.answers.ceiling)){fail('Укажите площадь числом от 1 до 1 000.',form.elements.area);return;}
    if(step.id==='contact'){await submit();return;}
    const goal={property:'quiz_apartment_selected',dimensions:'quiz_area_selected',repair:'quiz_tariff_selected'}[step.id];
    if(goal)track(goal,{step:state.step+1});
    const target=nextStepIndex(state.step);
    track('main_interaction',{action:'step_answer',control:step.id,step:state.step+1});state.history.push(state.step);state.step=target;render();
  }
  async function submit(){
    const digits=phoneDigits(state.phone);
    if(!digits){fail('Укажите номер из 10 цифр после +7.',form.elements.phone);return;}
    if(!state.consent){fail('Подтвердите согласие на обработку данных.',form.elements.personal_data_consent);return;}
    const size=parseDimensions(state.answers.area,state.answers.ceiling);
    if(!size){fail('Проверьте площадь и высоту потолков.');return;}
    state.sending=true;next.disabled=true;back.disabled=true;next.querySelector('span').textContent='Отправляем…';
    track('quiz_submit_attempt',{step:state.step+1});
    try{
      const payload={kind:'repair_reference',phone:'+'+digits,consent:true,name:state.name.trim(),website:form.elements.website?.value||'',referenceBrief:{city:state.answers.city,property:state.answers.property,rooms:state.answers.rooms,...size,repair:state.answers.repair,scope:state.answers.scope,channels:state.answers.channels},source:window.VerhLead?.source().href||location.href,submittedAt:new Date().toISOString()};
      const delivery=preview?{status:'preview',duplicate:false}:await window.VerhLead.send(window.VERH_LEAD_ENDPOINT,payload);
      if(!['unverified','sent','preview'].includes(delivery.status))throw Error('No receipt');
      state.submitted=true;form.hidden=true;result.hidden=false;result.classList.add('terminal');progress.style.width='100%';progressLabel.textContent='100%';
      dialog.setAttribute('aria-labelledby','result-title');
      result.innerHTML=`<h2 id="result-title" tabindex="-1">${preview?'Предварительный просмотр':'Заявка получена'}</h2><p>${preview?'Локальная проверка завершена. Заявка в MAX не отправлялась.':delivery.duplicate?'Эта заявка уже получена. Повторное обращение не создавали.':'Телефон и ответы переданы специалисту ВЕРХ. Игорь свяжется с вами, чтобы уточнить задачу и подготовить расчёт.'}</p><p class="quiz-summary"><strong>${esc(size.area)} м²</strong> · ${esc(steps.find(s=>s.id==='property').options.find(o=>o[0]===state.answers.property)?.[1])} · ${esc(steps.find(s=>s.id==='repair').options.find(o=>o[0]===state.answers.repair)?.[1])}</p><p>Точную стоимость и сроки закрепим в договоре после осмотра.</p><button class="primary" type="button" data-close-result>Вернуться на сайт</button>`;
      result.querySelector('h2').focus({preventScroll:true});dialog.scrollTop=0;
    }catch{
      state.sending=false;next.disabled=false;back.disabled=false;next.querySelector('span').textContent='Повторить отправку';
      fail('Не получили подтверждение доставки. Ответы и телефон остались в форме. Попробуйте ещё раз или позвоните по номеру +7 (918) 238-30-59.');track('quiz_lead_failure',{step:state.step+1});
    }
  }
  form.addEventListener('submit',event=>{event.preventDefault();if(event.isTrusted!==false)void advance();});
  form.addEventListener('change',event=>{
    if(event.isTrusted===false||state.sending)return;
    const input=event.target,step=steps[state.step];
    if(input.name===step.id&&step.options){
      state.answers[step.id]=input.value;const from=state.step;clearAuto();autoTimer=setTimeout(()=>{if(state.step===from&&dialog.open)void advance();},150);
    }
  });
  panel.addEventListener('click',event=>{
    if(event.isTrusted===false||state.sending||steps[state.step].id!=='dimensions')return;
    const button=event.target.closest('[data-area-choice]');if(!button)return;
    form.elements.area.value=button.dataset.areaChoice;void advance();
  });
  form.addEventListener('input',event=>{
    if(event.isTrusted===false)return;error.hidden=true;
    if(event.target.name==='phone'){
      if(hasPhoneInput(event.target.value)&&!state.phoneStarted){state.phoneStarted=true;track('repair_phone_input_start',{form:'repair_reference',step:state.step+1});}
      if(phoneDigits(event.target.value)&&!state.phoneValid){state.phoneValid=true;track('repair_phone_valid',{form:'repair_reference',step:state.step+1});}
    }
  },true);
  form.addEventListener('paste',event=>{
    if(event.isTrusted===false||event.target.name!=='phone')return;
    const field=event.target;
    queueMicrotask(()=>{
      if(hasPhoneInput(field.value)&&!state.phoneStarted){state.phoneStarted=true;track('repair_phone_input_start',{form:'repair_reference',step:state.step+1});}
      if(phoneDigits(field.value)&&!state.phoneValid){state.phoneValid=true;track('repair_phone_valid',{form:'repair_reference',step:state.step+1});}
    });
  },true);
  back.addEventListener('click',event=>{if(event.isTrusted===false||state.sending||!state.history.length)return;remember();state.step=state.history.pop();render();});
  result.addEventListener('click',event=>{
    if(event.isTrusted===false)return;
    if(event.target.closest('[data-return-city]')){state.step=0;state.history=[];state.answers.city='krasnodar';form.hidden=false;result.hidden=true;render();}
    if(event.target.closest('[data-close-result]'))dialog.close();
  });
  document.querySelectorAll('[data-open-quiz]').forEach(button=>button.addEventListener('click',event=>{
    if(event.isTrusted===false)return;trigger=button;
    if(!state.submitted){form.hidden=false;result.hidden=true;render();}
    dialog.showModal();track('quiz_open',{step:state.step+1});panel.querySelector('h2')?.focus({preventScroll:true});
  }));
  document.querySelector('.close').addEventListener('click',event=>{if(event.isTrusted!==false)dialog.close();});
  dialog.addEventListener('close',()=>{clearAuto();if(!state.submitted)track('main_quiz_close',{step:state.step+1});trigger?.focus({preventScroll:true});});
})();
