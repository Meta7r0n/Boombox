import {mkdir, cp, readFile, writeFile, rm} from 'node:fs/promises';
await rm('dist/cloudflare', {recursive:true, force:true});
await mkdir('dist/cloudflare/app', {recursive:true});
await cp('public', 'dist/cloudflare', {recursive:true});
await cp('cloudflare/shell.html', 'dist/cloudflare/index.html');
await cp('src/index.html', 'dist/cloudflare/app/index.html');
// Buildless artifact; all original artwork and music remain same-origin.
const html = await readFile('dist/cloudflare/app/index.html','utf8');
if (!html.includes('// Persistent oto player.')) throw new Error('Run prepare-music.mjs before the Cloudflare build.');
await writeFile('dist/cloudflare/robots.txt', 'User-agent: *\nDisallow: /api/\n');
console.log('oto Cloudflare assets built in dist/cloudflare; no deployment performed.');
