const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),js=fs.readFileSync(path.join(root,'remont-kvartir/quiz.js'),'utf8'),css=fs.readFileSync(path.join(root,'remont-kvartir/style.css'),'utf8');
const between=(from,to)=>js.slice(js.indexOf(from),js.indexOf(to,js.indexOf(from)));
test('contact channel is three visible radio buttons with MAX first and selected by default',()=>{
 assert.match(js,/channels:\['max'\]/);assert.doesNotMatch(js,/<select name="channel"/);
 assert.match(js,/const channelOptions=\[\['max','MAX'\],\['telegram','Telegram'\],\['phone','Звонок'\]\];/);
 assert.match(js,/<input type="radio" name="channel" value="\$\{value\}" \$\{currentChannel\(\)===value\?'checked':''\} \/>/);
 assert.match(js,/<fieldset class="channel-choice"><legend>Как удобнее связаться<\/legend>/);
});
test('channel helper falls back to MAX for unknown or missing values',()=>{
 const code=between('const channelOptions=','function esc')||'';const start=js.indexOf('const channelOptions='),end=js.indexOf('const esc=');
 const c={state:{answers:{channels:['max']}}};vm.runInNewContext(js.slice(start,end)+'this.currentChannel=currentChannel;',c);
 assert.equal(c.currentChannel(),'max');c.state.answers.channels=['telegram'];assert.equal(c.currentChannel(),'telegram');
 for(const bad of [[],[''],['sms'],[undefined]]){c.state.answers.channels=bad;assert.equal(c.currentChannel(),'max');}
});
test('speed note names the chosen channel; purpose note and trust badges make no sales claims',()=>{
 const start=js.indexOf('const channelOptions='),end=js.indexOf('const esc=');const c={state:{answers:{channels:['max']}}};
 vm.runInNewContext(js.slice(start,end)+'this.speedNotes=speedNotes;this.purposeNote=purposeNote;this.trustBadges=trustBadges;',c);
 assert.deepEqual(Object.keys(c.speedNotes).sort(),['max','phone','telegram']);
 assert.match(c.speedNotes.max,/напишем в MAX в течение 2–3 минут\.$/);assert.match(c.speedNotes.telegram,/напишем в Telegram в течение 2–3 минут\.$/);assert.match(c.speedNotes.phone,/позвоним в течение 2–3 минут\.$/);
 for(const text of Object.values(c.speedNotes))assert.match(text,/^Наш сотрудник уже держит палец над кнопкой — /);
 assert.equal(c.purposeNote,'Номер нужен, чтобы уточнить детали и посчитать ремонт именно под вашу квартиру.');
 assert.deepEqual(Array.from(c.trustBadges),['Без рассылок','Не передаём в базы','Только по вашей заявке']);
 for(const text of [c.purposeNote,...c.trustBadges,...Object.values(c.speedNotes)])assert.doesNotMatch(text,/сертифи|гарант|лучш|№\s?1|скидк|акци|бесплатн/i);
});
test('contact step renders channel, phone, speed note and privacy note before the optional name and consent',()=>{
 const block=between("else if(step.id==='contact'){","}else{");
 const order=['class="contact-prompt"','class="channel-choice"','name="phone"','id="contact-speed"','${esc(purposeNote)}','class="trust-badges"','name="name"','name="personal_data_consent"','name="website"'].map(part=>block.indexOf(part));
 assert(order.every(index=>index>=0),JSON.stringify(order));assert.deepEqual([...order].sort((a,b)=>a-b),order);
 assert.match(block,/id="contact-speed" aria-live="polite">\$\{esc\(speedNote\(\)\)\}/);
});
test('choosing a channel updates state and the note, is tracked without private data and never auto-advances',()=>{
 const block=between("form.addEventListener('change'","panel.addEventListener('click'");
 assert.match(block,/if\(step\.id==='contact'&&input\.name==='channel'\)\{/);
 assert.match(block,/state\.answers\.channels=\[input\.value\];/);assert.match(block,/note\.textContent=speedNote\(\);/);
 assert.match(block,/track\('main_interaction',\{action:'channel_select',control:currentChannel\(\),step:state\.step\+1\}\);return;/);
 assert(block.indexOf("input.name==='channel'")<block.indexOf('autoTimer=setTimeout'));
 assert.match(js,/state\.answers\.channels=\[form\.elements\.channel\.value\];/);
});
test('benefit prompt and submit payload stay unchanged',()=>{
 assert.match(js,/phonePrompt:'За этим номером мы закрепим расчет сметы в трех вариантах с выгодой до 250 000 рублей и подарки'/);
 assert.match(js,/title:'Куда отправить расчёт\?'/);assert.match(js,/channels:state\.answers\.channels\},source:/);assert.match(js,/kind:'repair_reference'/);
 for(const goal of ['main_quiz_contact','repair_phone_view','repair_phone_input_start','repair_phone_valid','quiz_submit_attempt','quiz_lead_failure'])assert(js.includes("'"+goal+"'"),goal);
});
test('styles cover the channel buttons, their checked and focus states and the notes',()=>{
 for(const rule of ['.channel-choice{','.channel-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))','.channel-option input:checked+span{','.channel-option input:focus-visible+span{','.contact-note{','.trust-badges{','.trust-badges li::before{','#question-panel.is-contact{padding-top:24px}'])assert(css.includes(rule),rule);
 assert.match(css,/\.channel-option span\{[^}]*min-height:48px/);
});
test('contact step gets a compact layout class that other steps drop',()=>{
 assert.match(js,/panel\.classList\.toggle\('is-contact',step\.id==='contact'\);/);
 assert(js.indexOf("panel.classList.toggle('is-contact'")<js.indexOf('panel.innerHTML=`<h2 id="question-title"'));
});
test('speed promise follows Moscow working hours 9:00-21:00 every day; outside them the step promises the morning',()=>{
 const start=js.indexOf('const channelOptions='),end=js.indexOf('const esc=');const c={state:{answers:{channels:['max']}}};
 vm.runInNewContext(js.slice(start,end)+'this.isWorkingTime=isWorkingTime;this.speedNote=speedNote;this.nightNotes=nightNotes;this.speedNotes=speedNotes;',c);
 const at=iso=>new Date(iso);
 for(const iso of ['2026-11-19T06:00:00Z','2026-11-19T12:30:00Z','2026-11-19T17:59:59Z','2026-11-21T06:00:00Z','2026-11-22T17:00:00Z'])assert.equal(c.isWorkingTime(at(iso)),true,iso);
 for(const iso of ['2026-11-19T05:59:59Z','2026-11-19T18:00:00Z','2026-11-19T21:14:00Z','2026-11-20T03:06:00Z','2026-11-21T20:59:00Z'])assert.equal(c.isWorkingTime(at(iso)),false,iso);
 assert.equal(c.speedNote(at('2026-11-19T12:30:00Z')),c.speedNotes.max);assert.equal(c.speedNote(at('2026-11-19T21:14:00Z')),c.nightNotes.max);
 c.state.answers.channels=['phone'];assert.equal(c.speedNote(at('2026-11-20T03:06:00Z')),'Сейчас наши сотрудники отдыхают — позвоним утром, с 9:00.');assert.equal(c.speedNote(at('2026-11-20T06:00:00Z')),c.speedNotes.phone);
 c.state.answers.channels=['telegram'];assert.equal(c.speedNote(at('2026-11-19T18:00:00Z')),'Сейчас наши сотрудники отдыхают — напишем в Telegram утром, с 9:00.');
 assert.deepEqual(Object.keys(c.nightNotes).sort(),['max','phone','telegram']);for(const text of Object.values(c.nightNotes))assert.doesNotMatch(text,/минут/);
});
