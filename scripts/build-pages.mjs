import {readFile,writeFile,access} from 'node:fs/promises';
let html=await readFile('src/index.html','utf8');
if(!html.includes('// GitHub Pages device runtime.'))throw Error('Run prepare-music.mjs first.');
html=html.replace('<head>', '<head>\n<base href="./">\n<script>window.OTO_LOCAL_MODE=true;window.OTO_APP_URL=new URL("./",location.href).href;</script>');
// GitHub Pages project paths are /Boombox/, rather than the domain root.
html=html.replaceAll('/music/','./public/music/').replaceAll('/secrets/','./public/secrets/');
html=html.replace('<div class="brand-sub">ANIME RADIO WORKSHOP</div>','<div class="brand-sub">DEVICE EDITION · SAVED IN THIS BROWSER</div>');
html=html.replace('A little radio. A world to get lost in.','No online sign-in. Profiles and tapes stay on this device.');
html=html.replace('</head>','<style>#oto-signin{display:none!important}.device-note{padding:12px 24px;background:var(--mint);color:var(--ink);font-size:13px;line-height:1.5}</style></head>');
html=html.replace('<header>','<div class="device-note">oto · 音 — Device edition. Uploads, profiles and mixtapes stay in this browser. Shared radio and messages will use the separate online edition.</div><header>');
await writeFile('index.html',html);await writeFile('.nojekyll','');
await access('public/music');await access('public/secrets');
console.log('Standalone GitHub Pages app written to index.html; no redirect or online sign-in.');
