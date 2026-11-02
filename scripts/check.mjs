import { existsSync } from 'node:fs';
for (const f of ['index.html','404.html','netlify.toml','scripts/build.mjs']) if(!existsSync(f)) throw new Error(`Missing ${f}`);
console.log('amani-web static checks passed');
