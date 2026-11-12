const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
for(const file of ['assets/js/lead-support.js','design/assets/js/lead-support.js']){
  for(const status of ['available','ym_unavailable','invalid','exception','timeout'])test(file+': '+status+' records diagnostic and still delivers once',async()=>{
    let payload,posts=0,expire,callback;const goals=[];
    const window={VerhSmartCaptcha:{monitoring:true,mode:'smartcaptcha-v1',submit:async(_url,p)=>{posts++;payload=p;return {leadId:'unit',formType:'repair_main',duplicate:false};}}};
    if(status!=='ym_unavailable')window.ym=(_id,method,arg)=>{if(method!=='getClientID'){goals.push(arg);return;}callback=arg;if(status==='exception')throw Error('private');if(status==='available')arg('12345');if(status==='invalid')arg('private-invalid');};
    const context={window,URL,location:new URL('https://verhremont.ru/?utm_source=qa'),sessionStorage:{getItem:()=>null,setItem:()=>{}},document:{querySelectorAll:()=>[]},setTimeout:fn=>(expire=fn,1),clearTimeout:()=>{},AbortController};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
    const sent=window.VerhLead.send('/lead',{phone:'private-test'});if(status==='timeout')expire();await sent;
    assert.equal(payload.attribution.clientIdStatus,status);assert.equal(payload.attribution.clientId,status==='available'?'12345':'');assert.equal(posts,1);
    if(status==='timeout'){callback('999');assert.equal(payload.attribution.clientId,'');assert.equal(posts,1);}
    assert(!goals.includes('quiz_lead_success'));assert(!goals.includes('repair_interest_manager_confirmed_v2'));
  });
}
