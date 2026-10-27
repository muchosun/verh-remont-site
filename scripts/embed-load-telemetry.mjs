import fs from 'node:fs';
const root = new URL('../',import.meta.url);
const code = fs.readFileSync(new URL('assets/js/load-telemetry.js',root),'utf8').trim();
const block = `<!-- load-telemetry:start -->\n<script>${code}</script>\n<!-- load-telemetry:end -->`;
for (const name of ['index.html','design/index.html']) {
  const file = new URL(name,root);
  const html = fs.readFileSync(file,'utf8');
  const start = html.indexOf('<!-- load-telemetry:start -->');
  if (start >= 0) {
    const end = html.indexOf('<!-- load-telemetry:end -->',start);
    if (end < 0) throw new Error(`Incomplete telemetry block: ${name}`);
    fs.writeFileSync(file,html.slice(0,start)+block+html.slice(end+'<!-- load-telemetry:end -->'.length));
  } else {
    const marker = '    <meta name="viewport" content="width=device-width, initial-scale=1" />';
    if (!html.includes(marker)) throw new Error(`Missing viewport: ${name}`);
    fs.writeFileSync(file,html.replace(marker,marker+'\n'+block));
  }
}
