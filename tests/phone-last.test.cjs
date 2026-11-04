const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),script=fs.readFileSync(path.join(root,'script.js'),'utf8');
function handler(marker){const start=script.indexOf(marker);assert(start>=0);return script.slice(start,script.indexOf('\n});',start)+4);}
test('main asks three project questions before the only phone field and consent',()=>{
  assert.deepEqual([...html.matchAll(/class="slide(?: is-active)?" data-step="(\d)"/g)].map(x=>x[1]),['0','1','2','3']);
  assert.equal((html.match(/id="phone-input"/g)||[]).length,1);
  assert(html.indexOf('id="phone-input"')>html.indexOf('data-level='));
  assert.match(html,/id="lead-form" data-phone-flow="phone_last"/);
  const form=html.slice(html.indexOf('id="lead-form"'),html.indexOf('</form>',html.indexOf('id="lead-form"')));
  assert.match(form,/personal_data_consent/);assert.match(form,/name="phone"[^>]*required/);
  assert.doesNotMatch(html,/id="quiz-phone-form"|repair-draft\.js/);
  assert.doesNotMatch(script,/VerhRepairDraft|phoneConfirmed|phoneReturnStep/);
});
test('main final submit rejects malformed phones, missing consent, hidden or synthetic actions',async()=>{
  for(const options of [{phone:'+7123'},{phone:'+79012345678',consent:false},{phone:'+79012345678',trusted:false},{phone:'+79012345678',active:false},{phone:'+79012345678',maxStep:2}]){
    let submit,calls=0,phoneError='';
    const context={state:{maxStep:options.maxStep??3},leadForm:{dataset:{},addEventListener:(_,fn)=>submit=fn,reportValidity:()=>options.consent!==false},phoneInput:{value:options.phone,setCustomValidity:v=>phoneError=v,reportValidity(){}},isQuizStep:()=>options.active!==false,sendLeadToMax:()=>{calls++;}};
    vm.runInNewContext(handler('leadForm.addEventListener("submit", async (event) => {'),context);
    await submit({isTrusted:options.trusted!==false,preventDefault(){}});
    assert.equal(calls,0);if(options.phone==='+7123')assert.match(phoneError,/10 цифр/);
  }
});
test('questions are not gated by a phone and calculation stays hidden until successful submission',()=>{
  const nav=script.slice(script.indexOf('function setStep('),script.indexOf('function renderSummary()'));
  assert.doesNotMatch(nav,/phoneConfirmed|leadPhone/);
  assert.match(script,/if \(state\.leadSubmitted\)/);
  assert.match(script,/summaryEstimate\.textContent = "после завершения квиза"/);
});
