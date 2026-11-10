const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'../remont-kvartir/quiz.js'),'utf8');
function fixture(){
 const handlers={},calls=[],state={phoneStarted:false,phoneValid:false,step:6},c={state,error:{hidden:false},form:{addEventListener:(event,fn)=>handlers[event]=fn},track:(name,params)=>calls.push({name,params})};
 vm.runInNewContext(js.slice(js.indexOf('function phoneDigits('),js.indexOf('function nextStepIndex(')),c);
 vm.runInNewContext(js.slice(js.indexOf("form.addEventListener('input'"),js.indexOf("back.addEventListener('click'")),c);
 return{calls,state,input:(value,isTrusted=true,name='phone')=>handlers.input({isTrusted,target:{name,value}})};
}
test('first national digit starts phone input without waiting for a second digit',()=>{
 const f=fixture();f.input('9');assert.deepEqual(f.calls.map(x=>x.name),['repair_phone_input_start']);
 for(const value of ['90','901','+7 (901)'])f.input(value);
 assert.equal(f.calls.filter(x=>x.name==='repair_phone_input_start').length,1);
});
test('country prefixes, formatting, synthetic input and unrelated fields do not pretend to be typing',()=>{
 const f=fixture();for(const value of ['','+','+7','7','8','+7 (___) ___-__-__'])f.input(value);
 f.input('+7 90',false);f.input('9',true,'name');assert.equal(f.calls.length,0);
 f.input('+7 9');assert.deepEqual(f.calls.map(x=>x.name),['repair_phone_input_start']);
});
test('pasted full number starts input before valid, once, without exposing the number',()=>{
 const f=fixture();f.input('+79990001234');f.input('+79990001234');
 assert.deepEqual(f.calls.map(x=>x.name),['repair_phone_input_start','repair_phone_valid']);
 assert.doesNotMatch(JSON.stringify(f.calls),/79990001234|90001234/);
 assert.equal(f.calls[0].params.form,'repair_reference');
});
