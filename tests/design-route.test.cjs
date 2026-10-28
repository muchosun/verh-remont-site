const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'uslugi/dizayn-proekt/redirect.js'), 'utf8');
function redirect(search = '', hash = '') {
  let target;
  vm.runInNewContext(code, {URL, location:{origin:'https://verhremont.ru',search,hash,replace:value=>{target=new URL(value);}}});
  return target;
}
test('legacy route uses current quiz and defaults to the local city',()=>{
  assert.equal(redirect().href,'https://verhremont.ru/design/?city=krasnodar');
});
test('redirect preserves explicit city, attribution, click id and anchor',()=>{
  const params = new URLSearchParams({city:'spb',utm_source:'qa',utm_campaign:'TEST_ROUTE',yclid:'test-click'});
  const target = redirect('?'+params,'#lead');
  assert.equal(target.pathname,'/design/');assert.equal(target.hash,'#lead');
  assert.equal(target.searchParams.toString(),params.toString());
});
test('utm_city is not overridden by default',()=>{
  const target=redirect('?utm_city=moscow_oblast');
  assert.equal(target.searchParams.has('city'),false);
  assert.equal(target.searchParams.get('utm_city'),'moscow_oblast');
});
test('main page and catalogue link directly to current design page',()=>{
  for(const filename of ['index.html','uslugi/index.html']){
    const html=fs.readFileSync(path.join(root,filename),'utf8');
    assert.match(html,/href="\/design\/\?city=krasnodar"/);
    assert.doesNotMatch(html,/href="(?:\/uslugi\/)?dizayn-proekt\/"/);
  }
});
test('legacy page has a fallback without obsolete wording or short form',()=>{
  const html=fs.readFileSync(path.join(root,'uslugi/dizayn-proekt/index.html'),'utf8');
  assert.match(html,/data-design-destination/);assert.match(html,/redirect\.js/);
  assert.doesNotMatch(html,/<form\b|обмер/i);
});
