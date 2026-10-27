import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function visit(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?visit(path.join(directory,entry.name)):entry.name.endsWith('.html')?[path.join(directory,entry.name)]:[]);}
for(const file of [path.join(root,'index.html'),...visit(path.join(root,'uslugi'))]){
 const html=fs.readFileSync(file,'utf8');
 const next=html.replaceAll('/assets/js/lead-support.js?v=20260914','/assets/js/lead-support.js?v=20261027-repair-captcha');
 if(next!==html)fs.writeFileSync(file,next);
}
