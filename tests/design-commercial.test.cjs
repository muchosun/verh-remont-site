const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'design/commercial.js'), 'utf8');

function run(search) {
  const make = () => ({textContent:'original', dataset:{}, hidden:false, attrs:{},
    setAttribute(key,value) { this.attrs[key]=value; },
    removeAttribute(key) { delete this.attrs[key]; if(key==='data-package') delete this.dataset.package; },
  });
  const selectors = ['meta[name="description"]','meta[property="og:description"]','meta[property="og:title"]','meta[property="og:image"]','.service-hero h1','.service-hero__content > h1 + p','.hero-offer','.service-hero__media > img:not(.media-watermark)','.service-hero__actions [data-scroll-lead]','#process h2','#lead','[data-service-form][data-brief-version="3"]'];
  const nodes = Object.fromEntries(selectors.map(key=>[key,make()]));
  const form = nodes['[data-service-form][data-brief-version="3"]'];
  form.elements={leadMode:{value:'brief'}};
  const links=Array.from({length:4},make), buttons=Array.from({length:8},make);
  buttons.forEach(button=>button.dataset.package='apartment-price');
  const items=Array.from({length:4},()=>{const nodes={strong:make(),p:make()};return {nodes,querySelector:key=>nodes[key]};});
  const html=make();
  const document={title:'apartment',documentElement:html,querySelector:key=>nodes[key],querySelectorAll:key=>({'.preview-nav a':links,'[data-scroll-lead]':buttons,'#process .process-list li':items}[key]||[])};
  vm.runInNewContext(source,{location:{search},URLSearchParams,document});
  return {document,html,nodes,form,links,buttons,items};
}

test('only the exact commercial intent activates the commercial entry',()=>{
  for(const search of ['', '?intent=design_apartment','?intent=design_commercial_other','?utm_campaign=design_commercial']) {
    const f=run(search);
    assert.equal(f.document.title,'apartment');
    assert.deepEqual(f.html.dataset,{});
    assert.equal(f.form.elements.leadMode.value,'brief');
    assert(f.buttons.every(b=>b.dataset.package==='apartment-price'));
  }
});
test('commercial entry uses the existing callback route without apartment packages or invented tariffs',()=>{
  const f=run('?city=krasnodar&intent=design_commercial&utm_source=qa');
  assert.equal(f.html.dataset.designIntent,'commercial');
  assert.match(f.nodes['.service-hero h1'].textContent,/Дизайн кафе и офисов/);
  assert.equal(f.form.elements.leadMode.value,'callback');
  assert(f.buttons.every(b=>b.dataset.leadMode==='callback'&&!('package' in b.dataset)));
  assert.match(f.nodes['#lead'].dataset.consultationDescription,/Площадь можно назвать/);
  assert(!/500|3 490|квартир|от 30/.test(JSON.stringify(f)));
  assert.deepEqual(f.links.slice(0,3).map(l=>l.attrs.href),['#process','#lead','#contacts']);
  assert.equal(f.links[3].hidden,true);
  assert.match(f.nodes['.service-hero__media > img:not(.media-watermark)'].src,/commercial-consultation\.jpg$/);
});
test('commercial styles are scoped and hide residential offers, while scripts run before quiz initialization',()=>{
  const css=fs.readFileSync(path.join(root,'design/commercial.css'),'utf8');
  for(const selector of ['#estimate','#prices','#gift','[data-lead-price]','[data-quiz-mode]']) assert(css.includes(selector));
  assert(css.startsWith('html[data-design-intent="commercial"]'));
  const html=fs.readFileSync(path.join(root,'design/index.html'),'utf8');
  assert(html.indexOf('commercial.js?')<html.indexOf('./analytics.js?'));
  assert(html.indexOf('commercial.js?')<html.indexOf('./quiz.js?'));
  assert.equal(/\bfetch\s*\(|\bym\s*\(|\.send\s*\(/.test(source),false);
  assert(fs.statSync(path.join(root,'design/assets/design/commercial-consultation.jpg')).size<400000);
});
