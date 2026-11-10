const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'remont-kvartir/index.html'),'utf8'),js=fs.readFileSync(path.join(root,'remont-kvartir/quiz.js'),'utf8');
test('separate quiz keeps existing pages untouched and uses the existing CAPTCHA sender',()=>{
 assert.match(html,/assets\/js\/smartcaptcha\.js/);assert.match(html,/assets\/js\/lead-support\.js/);assert(html.indexOf('smartcaptcha.js')<html.indexOf('lead-support.js'));
 assert.match(html,/metrika\/tag\.js\?id=110859289/);
 assert.match(js,/kind:'repair_reference'/);assert.match(js,/referenceBrief:/);assert.match(js,/window\.VerhLead\.send/);
 assert.doesNotMatch(js,/track\(['"]quiz_lead_success|localStorage|Math\.random/);
 assert.doesNotMatch(html,/250 000|60 дней|Газиев|79884714943|локта/i);
});
test('area remains numeric; optional ceiling is transmitted as entered text',()=>{
 const code=js.slice(js.indexOf('function parseDimensions('),js.indexOf('function phoneDigits(')),c={};vm.runInNewContext(code,c);
 for(const ceiling of ['270','2.7','2,7 м','не знаю','','150','501','270 см'])assert.deepEqual(JSON.parse(JSON.stringify(c.parseDimensions('63,5',ceiling))),{area:63.5,ceiling});
 for(const area of ['','19','63 м²','NaN','1e2','1001'])assert.equal(c.parseDimensions(area,'любая высота'),null,area);
 assert.equal(c.parseDimensions('65','x'.repeat(121)),null);
});
test('dimensions preserve both answers without numeric constraints on ceiling',()=>{
 assert.match(js,/name="area" inputmode="decimal"/);assert.match(js,/name="ceiling" autocomplete="off" maxlength="120"/);
 assert.doesNotMatch(js,/name="ceiling"[^>]*(?:required|inputmode="numeric")/);
 assert.match(js,/state\.answers\.area=form\.elements\.area/);assert.match(js,/state\.answers\.ceiling=form\.elements\.ceiling/);
 assert.doesNotMatch(js,/name="dimensions"|state\.answers\.dimensions/);
});
test('phone parser normalizes national and international formats and rejects partial numbers',()=>{
 const code=js.slice(js.indexOf('function phoneDigits('),js.indexOf('function fail(')),c={};vm.runInNewContext(code,c);
 for(const input of ['9012345678','89012345678','+7 (901) 234-56-78'])assert.equal(c.phoneDigits(input),'79012345678');
 for(const input of ['','+7','123','+790123456789'])assert.equal(c.phoneDigits(input),'');
});
test('analytics cannot transmit phones, names, answers, text or URL through arbitrary parameters',()=>{
 const start=js.indexOf('function track('),code=js.slice(start,js.indexOf('function parseDimensions(',start)),events=[];
 const c={preview:false,window:{ym:(...args)=>events.push(args)}};vm.runInNewContext(code,c);c.track('main_interaction',{phone:'private',name:'private',source:'private',step:2,action:'step_view',control:'property'});
 assert.doesNotMatch(JSON.stringify(events),/private/);assert.equal(events[0][3].flow,'reference_quiz_v2');
});
