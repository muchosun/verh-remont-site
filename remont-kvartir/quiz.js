(() => {
  'use strict';
  const preview=location.protocol==='file:'||['localhost','127.0.0.1'].includes(location.hostname)||window.VERH_PREVIEW;
  const dialog=document.querySelector('#quiz'),form=document.querySelector('#quiz-form'),panel=document.querySelector('#question-panel');
  const error=document.querySelector('#form-error'),result=document.querySelector('#quiz-result'),next=document.querySelector('.next'),back=document.querySelector('.back');
  const progress=document.querySelector('#progress-bar'),progressLabel=document.querySelector('#progress-label');
  const steps=[
    {id:'city',title:'Вы планируете ремонт квартиры (дома) в г.Краснодар?',options:[['krasnodar','Да, в г.Краснодар'],['other','Нет, у меня другой регион']]},
    {id:'property',title:'Где нужно сделать ремонт?',options:[['new','Новостройка'],['resale','Вторичное жилье'],['house','Частный дом'],['other','Другое']]},
    {id:'rooms',title:'Сколько комнат в квартире?',options:[['1','1 комната'],['2','2 комнаты'],['3','3 комнаты'],['4','4 и более']]},
    {id:'dimensions',title:'Площадь помещения (м2) и высота потолков'},
    {id:'repair',title:'Какой ремонт планируете делать?',cards:true,options:[
      ['first','Первый ремонт в новостройке','../v14/assets/web/quiz-newbuild.webp'],
      ['cosmetic','Косметический ремонт','../assets/tariffs/finish-cosmetic.webp'],
      ['capital','Капитальный ремонт','../v14/assets/web/quiz-secondary.webp'],
      ['designer','Дизайнерский ремонт','../assets/projects/lux/lux_03_msg180.webp']]},
    {id:'scope',title:'Какой объем работ потребуется выполнить?',options:[['preclean','Предчистовая отделка'],['full','Отделка всего помещения "под ключ" от черновой отделки до чистовой'],['one','Частичный ремонт одной комнаты'],['several','Частичный ремонт нескольких комнат'],['other','Другое']]},
    {id:'partialDecision',title:'Мы работаем только с ремонтом под ключ и с удовольствием поможем вам сделать полный ремонт',options:[['partial','Мне нужен именно частичный ремонт'],['full','Мне нужен ремонт под ключ']]},
    {id:'channels',title:'Куда Вам отправить расчет стоимости ремонта Вашей квартиры?',options:[['max','MAX'],['telegram','Telegram'],['phone','БЕСПЛАТНАЯ консультация по телефону - хочу узнать подробнее об акциях, которые сейчас проходят']]},
    {id:'contact',title:'Введите имя и номер телефона, на который Вам отправить расчет',phonePrompt:'За этим номером мы закрепим расчет сметы в трех вариантах с выгодой до 250 000 рублей и подарки'},
  ];
  const state={step:0,history:[],answers:{city:'krasnodar',property:'new',rooms:'',area:'',ceiling:'',repair:'',scope:'full',partialDecision:'',channels:['phone']},sending:false,submitted:false,phone:'',name:'',consent:false,phoneStarted:false,phoneValid:false};
  let trigger,autoTimer,phoneView=false;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function track(event,params={}){
    if(preview||typeof window.ym!=='function')return;
    const safe={landing:'repair_reference',flow:'reference_quiz_v1'};
    for(const key of ['step','control','action','form','field'])if(typeof params[key]==='string'||Number.isInteger(params[key]))safe[key]=params[key];
    try{window.ym(110859289,'reachGoal',event,safe);}catch{}
  }
  function parseDimensions(areaValue,ceilingValue){
    const areaText=String(areaValue??'').trim(),ceilingText=String(ceilingValue??'').trim();
    if(!/^\d+(?:[.,]\d+)?$/.test(areaText)||ceilingText.length>120)return null;
    const area=Number(areaText.replace(',','.')),ceiling=ceilingText;
    if(!Number.isFinite(area)||area<20||area>1000)return null;
    return{area:Math.round(area*10)/10,ceiling};
  }
  function phoneDigits(value){let d=String(value).replace(/\D/g,'');if(d.length===10)d='7'+d;if(d.length===11&&d.startsWith('8'))d='7'+d.slice(1);return /^7\d{10}$/.test(d)?d:'';}
  function nextStepIndex(index,answers){
    const id=steps[index].id;
    if(id==='scope')return ['one','several'].includes(answers.scope)?6:7;
    if(id==='partialDecision')return answers.partialDecision==='partial'?'reject_partial':7;
    return index+1;
  }
  function qualifiedScope(answers){return ['one','several'].includes(answers.scope)&&answers.partialDecision==='full'?'full':answers.scope;}
  function fail(message,field){error.textContent=message;error.hidden=false;if(field)field.focus();track('main_validation_error',{step:state.step+1,field:field?.type==='tel'?'phone':field?.type==='checkbox'?'consent':'form'});}
  function clearAuto(){clearTimeout(autoTimer);autoTimer=undefined;}
  function remember(){
    const step=steps[state.step];
    if(step.id==='dimensions'){state.answers.area=form.elements.area?.value||'';state.answers.ceiling=form.elements.ceiling?.value||'';}
    if(step.id==='contact'){state.name=form.elements.name?.value||'';state.phone=form.elements.phone?.value||'';state.consent=Boolean(form.elements.personal_data_consent?.checked);}
  }
  function render(){
    clearAuto();error.hidden=true;
    dialog.setAttribute('aria-labelledby','question-title');
    const step=steps[state.step],percentage=[0,18,27,36,45,54,63,81,90][state.step];
    progress.style.width=percentage+'%';progressLabel.textContent=percentage+'%';
    back.disabled=state.history.length===0||state.sending;next.disabled=state.sending;
    next.querySelector('span').textContent=step.id==='contact'?'Получить расчёт':'Далее';
    panel.innerHTML=`<h2 id="question-title" tabindex="-1">${esc(step.title)}</h2>`;
    if(step.id==='dimensions')panel.insertAdjacentHTML('beforeend',`<div class="contact-fields"><label class="text-field">Площадь, м²<input name="area" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="Например, 65" value="${esc(state.answers.area)}" required aria-describedby="area-note" /><span class="field-note" id="area-note">От 20 до 1 000 м².</span></label><label class="text-field">Высота потолков, если знаете<input name="ceiling" autocomplete="off" maxlength="120" placeholder="Например, 2,7 м или не знаю" value="${esc(state.answers.ceiling)}" aria-describedby="ceiling-note" /><span class="field-note" id="ceiling-note">Можно написать в любом удобном формате или пропустить.</span></label></div>`);
    else if(step.id==='contact'){
      panel.insertAdjacentHTML('beforeend',`<div class="contact-fields"><label class="text-field">Имя<input name="name" autocomplete="given-name" maxlength="60" value="${esc(state.name)}" /></label><label class="text-field"><span class="contact-prompt">${esc(step.phonePrompt)} <span aria-hidden="true">*</span></span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" aria-label="Телефон для расчёта" placeholder="+7 (___) ___-__-__" maxlength="24" value="${esc(state.phone)}" required /></label><label class="answer consent"><input type="checkbox" name="personal_data_consent" ${state.consent?'checked':''} required /><span>Я согласен(-на) на <a href="../consent.html" target="_blank" rel="noopener">обработку персональных данных</a></span></label></div><label class="hp" aria-hidden="true">Сайт<input name="website" tabindex="-1" autocomplete="off" /></label>`);
      if(!phoneView){phoneView=true;track('main_quiz_contact',{step:state.step+1});track('repair_phone_view',{form:'repair_reference',step:state.step+1});}
    }else{
      const multiple=step.id==='channels';
      const content=step.options.map(([value,label,image])=>{
        const checked=multiple?state.answers.channels.includes(value):state.answers[step.id]===value;
        return `<label class="${step.cards?'image-answer':'answer'}"><input type="${multiple?'checkbox':'radio'}" name="${step.id}" value="${esc(value)}" ${checked?'checked':''} />${image?`<img src="${image}" alt="" width="320" height="400" />`:''}<span>${esc(label)}</span></label>`;
      }).join('');panel.insertAdjacentHTML('beforeend',`<div class="answers ${step.cards?'cards':''}">${content}</div>`);
    }
    track('main_interaction',{action:'step_view',control:step.id,step:state.step+1});
    panel.querySelector('h2').focus({preventScroll:true});dialog.scrollTop=0;
  }
  function rejected(partial=false){
    const percentage=partial?72:9;
    progress.style.width=percentage+'%';progressLabel.textContent=percentage+'%';
    track('main_interaction',{action:partial?'partial_scope_rejected':'region_rejected',step:state.step+1});form.hidden=true;result.hidden=false;result.classList.add('terminal');
    dialog.setAttribute('aria-labelledby','result-title');
    result.innerHTML=partial?'<h2 id="result-title" tabindex="-1">К сожалению, не сможем Вам помочь с частичным ремонтом.</h2><p>Прохождение квиза далее не требуется</p><button type="button" class="primary" data-return-scope>Вернуться к объёму работ</button>':'<h2 id="result-title" tabindex="-1">Извините, но мы не сможем вам помочь. Наша компания занимается ремонтом под ключ только в г.Краснодар</h2><p>Заполнение анкеты далее не требуется</p><button type="button" class="primary" data-return-city>Вернуться к выбору города</button>';
    result.querySelector('h2').focus();
  }
  async function advance(){
    if(state.sending||state.submitted)return;clearAuto();remember();
    const step=steps[state.step],answer=state.answers[step.id];
    if(step.id==='city'&&answer==='other'){rejected();return;}
    if(step.options&&(!answer||Array.isArray(answer)&&!answer.length)){fail('Выберите хотя бы один вариант.');return;}
    if(step.id==='dimensions'&&!parseDimensions(state.answers.area,state.answers.ceiling)){fail('Укажите площадь числом от 20 до 1 000.',form.elements.area);return;}
    if(step.id==='contact'){await submit();return;}
    const goal={property:'quiz_apartment_selected',dimensions:'quiz_area_selected',repair:'quiz_tariff_selected'}[step.id];
    if(goal)track(goal,{step:state.step+1});
    const target=nextStepIndex(state.step,state.answers);
    if(target==='reject_partial'){rejected(true);return;}
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
      const payload={kind:'repair_reference',phone:'+'+digits,consent:true,name:state.name.trim(),website:form.elements.website?.value||'',referenceBrief:{city:state.answers.city,property:state.answers.property,rooms:state.answers.rooms,...size,repair:state.answers.repair,scope:qualifiedScope(state.answers),channels:state.answers.channels},source:window.VerhLead?.source().href||location.href,submittedAt:new Date().toISOString()};
      const delivery=preview?{status:'preview',duplicate:false}:await window.VerhLead.send(window.VERH_LEAD_ENDPOINT,payload);
      if(!['unverified','sent','preview'].includes(delivery.status))throw Error('No receipt');
      state.submitted=true;form.hidden=true;result.hidden=false;result.classList.add('terminal');progress.style.width='100%';progressLabel.textContent='100%';
      dialog.setAttribute('aria-labelledby','result-title');
      result.innerHTML=`<h2 id="result-title" tabindex="-1">${preview?'Предварительный просмотр':'Заявка получена'}</h2><p>${preview?'Локальная проверка завершена. Заявка в MAX не отправлялась.':delivery.duplicate?'Эта заявка уже получена. Повторное обращение не создавали.':'Телефон и ответы переданы специалисту ВЕРХ. Игорь свяжется с вами, чтобы уточнить задачу и подготовить расчёт.'}</p><p class="quiz-summary"><strong>${esc(size.area)} м²</strong> · ${esc(steps[1].options.find(o=>o[0]===state.answers.property)?.[1])} · ${esc(steps[4].options.find(o=>o[0]===state.answers.repair)?.[1])}</p><p>Точную стоимость и сроки закрепим в договоре после осмотра.</p><button class="primary" type="button" data-close-result>Вернуться на сайт</button>`;
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
      if(step.id==='channels')state.answers.channels=[...form.querySelectorAll('input[name="channels"]:checked')].map(i=>i.value);
      else{if(step.id==='scope'&&state.answers.scope!==input.value)state.answers.partialDecision='';state.answers[step.id]=input.value;const from=state.step;clearAuto();autoTimer=setTimeout(()=>{if(state.step===from&&dialog.open)void advance();},150);}
    }
  });
  form.addEventListener('input',event=>{
    if(event.isTrusted===false)return;error.hidden=true;
    if(event.target.name==='phone'){
      if(event.target.value.replace(/\D/g,'').length>1&&!state.phoneStarted){state.phoneStarted=true;track('repair_phone_input_start',{form:'repair_reference',step:state.step+1});}
      if(phoneDigits(event.target.value)&&!state.phoneValid){state.phoneValid=true;track('repair_phone_valid',{form:'repair_reference',step:state.step+1});}
    }
  });
  back.addEventListener('click',event=>{if(event.isTrusted===false||state.sending||!state.history.length)return;remember();state.step=state.history.pop();render();});
  result.addEventListener('click',event=>{
    if(event.isTrusted===false)return;
    if(event.target.closest('[data-return-city]')){state.step=0;state.history=[];state.answers.city='krasnodar';form.hidden=false;result.hidden=true;render();}
    if(event.target.closest('[data-return-scope]')){state.step=5;state.history=state.history.filter(i=>i<5);state.answers.partialDecision='';form.hidden=false;result.hidden=true;render();}
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
