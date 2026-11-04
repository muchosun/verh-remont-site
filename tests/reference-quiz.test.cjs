const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'remont-kvartir/index.html'),'utf8'),js=fs.readFileSync(path.join(root,'remont-kvartir/quiz.js'),'utf8');
test('separate quiz keeps existing pages untouched and uses the existing CAPTCHA sender',()=>{
 assert.match(html,/assets\/js\/smartcaptcha\.js/);assert.match(html,/assets\/js\/lead-support\.js/);assert(html.indexOf('smartcaptcha.js')<html.indexOf('lead-support.js'));
 assert.match(html,/metrika\/tag\.js\?id=110859289/);
 assert.match(js,/kind:'repair_reference'/);assert.match(js,/referenceBrief:/);assert.match(js,/window\.VerhLead\.send/);
 assert.doesNotMatch(js,/track\(['"]quiz_lead_success|localStorage|Math\.random/);
 assert.doesNotMatch(html,/250 000|60 дней|Газиев|79884714943|локта/i);
});
test('separate dimensions accept plain numbers and decimal area without units',()=>{
 const code=js.slice(js.indexOf('function parseDimensions('),js.indexOf('function phoneDigits(')),c={};vm.runInNewContext(code,c);
 for(const [area,ceiling] of [['63,5','270'],['63.5','270'],[63.5,270],[' 63.5 ',' 270 ']])assert.deepEqual(JSON.parse(JSON.stringify(c.parseDimensions(area,ceiling))),{area:63.5,ceiling:270});
 assert.deepEqual(JSON.parse(JSON.stringify(c.parseDimensions('65','280'))),{area:65,ceiling:280});
 for(const [area,ceiling] of [['','270'],['63',''],['19','270'],['63','150'],['63','2.7'],['63 м²','270'],['63','270 см'],['NaN','270'],['1e2','270'],['63','270.5'],['1001','270'],['65','501']])assert.equal(c.parseDimensions(area,ceiling),null,JSON.stringify([area,ceiling]));
});
test('dimensions keep two independently labelled numeric keyboard inputs and preserve both answers',()=>{
 assert.match(js,/name="area" inputmode="decimal"/);assert.match(js,/name="ceiling" inputmode="numeric"/);
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
 assert.doesNotMatch(JSON.stringify(events),/private/);assert.equal(events[0][3].flow,'reference_quiz_v1');
});
