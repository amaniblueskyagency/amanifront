import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {join} from 'node:path';
const images=['about.jpg','call-to-action.jpg','carousel-1.jpg','carousel-2.jpg','header.jpg',
  ...Array.from({length:6},(_,i)=>`property-${i+1}.jpg`),
  ...Array.from({length:4},(_,i)=>`team-${i+1}.jpg`),
  ...Array.from({length:4},(_,i)=>`testimonial-${i+1}.jpg`)];
function jsFiles(folder){return readdirSync(folder,{withFileTypes:true}).flatMap(x=>x.isDirectory()?jsFiles(join(folder,x.name)):
    x.isFile()&&x.name.endsWith('.js')?[join(folder,x.name)]:[]);}
const pageFiles=readdirSync('.').filter(x=>x.endsWith('.html'));
const styles=readdirSync('css').filter(x=>x.endsWith('.css')).map(x=>join('css',x));
const sourceFiles=[...pageFiles,...styles,...jsFiles('js')];
let removed=0,protectedCount=0;
for(const name of images){
  const path=join('img',name);
  if(!existsSync(path)) continue;
  const referenced=sourceFiles.filter(file=>readFileSync(file,'utf8').includes(`img/${name}`));
  if(referenced.length){console.warn(`[KEEP] ${path} referenced in ${referenced.join(', ')}`);protectedCount++;continue;}
  await rm(path);console.log(`[REMOVE] Obsolete template photo: ${path}`);removed++;
}
console.log(`Template media cleanup: ${removed} removed, ${protectedCount} kept due to active references. Property gallery folders untouched.`);
