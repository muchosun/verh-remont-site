const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const list=fs.readFileSync(path.join(root,'stati/index.html'),'utf8');
const urls=[...list.matchAll(/href="(\/stati\/[^"/]+\/)"/g)].map(m=>m[1]);
const unique=[...new Set(urls)];
test('index links to 11 distinct articles',()=>assert.equal(unique.length,11));
test('article HTML is crawlable and metadata and assets match sitemap',()=>{
 const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');const titles=new Set();
 for(const url of unique){
  const file=path.join(root,url,'index.html');assert(fs.existsSync(file),url);const html=fs.readFileSync(file,'utf8');
  assert.match(html,/<h1>[^<]+<\/h1>/);assert.match(html,/<meta name="description" content="[^"]+">/);assert(html.includes(`rel="canonical" href="https://verhremont.ru${url}"`));assert(sitemap.includes(`<loc>https://verhremont.ru${url}</loc>`));
  const title=html.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title));titles.add(title);
  const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(data.mainEntityOfPage,'https://verhremont.ru'+url);
  for(const src of [...html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:\?[^"#]*)?"/g)].map(m=>m[1])){const target=path.join(root,src);assert(fs.existsSync(target),`${url}: ${src}`);}
  assert(html.includes('guides-metrika.js'));assert(!html.includes('reachGoal'));
 }
});
test('articles are linked from homepage and index is in sitemap',()=>{assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="/stati/"'));assert(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes('<loc>https://verhremont.ru/stati/</loc>'));});
