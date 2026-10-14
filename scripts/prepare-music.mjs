import {readFile,writeFile,access} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('music/catalog.json','utf8'));
const ids=new Set();
for(const song of catalog){if(!song.id?.startsWith('starter-')||ids.has(song.id)||!song.title||!song.duration||!song.url?.startsWith('/music/'))throw Error('Invalid starter song catalog');ids.add(song.id);await access('public'+song.url)}
let html=await readFile('src/index.html','utf8');
const behavior=await readFile('src/music.js','utf8');
const direct=(await readFile('src/hardware.js','utf8')).replace('// End direct boombox hardware.',(await readFile('src/handbook.js','utf8'))+'\n// End direct boombox hardware.');
html=html.replace(/\/\/ Direct boombox hardware,[\s\S]*?\/\/ End direct boombox hardware\./,()=>direct.trim());
const secretSongs=JSON.parse(await readFile('music/secrets.json','utf8'));for(const song of secretSongs){if(!song.id?.startsWith('secret-')||!song.egg||!song.duration||!song.url?.startsWith('/music/secrets/'))throw Error('Invalid secret song catalog');await access('public'+song.url)}
const front=(await readFile('src/secret-hardware.js','utf8')).replace('const secretFrontGeometry={};','const secretFrontGeometry='+await readFile('secrets/front-controls.json','utf8')+';');
const tunes=JSON.parse(await readFile('secrets/tunes.json','utf8'));const secrets=(await readFile('src/easter-eggs.js','utf8')).replace('const secretTunes={};','const secretTunes='+JSON.stringify(tunes)+';').replace('// End secret telephone discoveries.',front+'\n// End secret telephone discoveries.').replace('const secretSongCatalog=[];','const secretSongCatalog='+JSON.stringify(secretSongs)+';');
if(html.includes('// Secret telephone discoveries'))html=html.replace(/\/\/ Secret telephone discoveries[\s\S]*?\/\/ End secret telephone discoveries\./,()=>secrets.trim());else html=html.replace('// Player entrance and interface preferences.',()=>secrets+'\n// Player entrance and interface preferences.');
const codec=(await readFile('src/tape-codec.mjs','utf8')).replaceAll('export function','function');
const phone='// Friends telephone.\nconst tapeCodec=(()=>{'+codec+';return {encodeTape,decodeTape,tapeInfo}})();\n'+await readFile('src/phone.js','utf8');
html=html.replace(/\/\/ Friends telephone\.[\s\S]*?\/\/ End friends telephone\./,()=>phone.trim());
const profiles=await readFile('src/profiles.js','utf8');
html=html.replace(/\/\/ Player entrance and interface preferences\.[\s\S]*?\/\/ End player entrance\./,()=>profiles.trim());
const navigation=await readFile('src/display-navigation.js','utf8');
html=html.replace(/\/\/ Fullscreen scene navigation[\s\S]*?\/\/ End fullscreen scene navigation\./,()=>navigation.trim());
html=html.replace(/\/\/ Real recordings use[\s\S]*?(?=\/\/ Direct boombox hardware,|async function bundleStarterMusic)/,()=>behavior+'\n');
html=html.replace(/<script id="starter-catalog" type="application\/json">[\s\S]*?<\/script>/,'<script id="starter-catalog" type="application/json">'+JSON.stringify(catalog).replace(/</g,'\\u003c')+'</script>');
const radio='// Community radio runtime.\n'+(await readFile('src/radio-core.mjs','utf8')).replaceAll('export ','')+'\n'+await readFile('src/radio.js','utf8');
if(html.includes('// Community radio runtime.'))html=html.replace(/\/\/ Community radio runtime\.[\s\S]*?\/\/ End community radio\./,()=>radio.trim());else html=html.replace('// End direct boombox hardware.',()=> '// End direct boombox hardware.\n'+radio.trim());
const branding=await readFile('src/branding.js','utf8');
const player='// Persistent oto player.\n'+(await readFile('src/oto-core.mjs','utf8')).replaceAll('export ','')+'\n'+(await readFile('src/oto-player.js','utf8')).replace('// Persistent oto player.','');
for(const [marker,end,code] of [['oto stereo branding.','End oto stereo branding.',branding],['Persistent oto player.','End persistent oto player.',player]]){
 const start='// '+marker,finish='// '+end;
 if(html.includes(start)){const begin=html.indexOf(start),stop=html.indexOf(finish,begin)+finish.length;html=html.slice(0,begin)+code.trim()+html.slice(stop)}
 else html=html.replace('syncControls();draw();render($(\'#intro-art\')',()=>code.trim()+'\n'+'syncControls();draw();render($(\'#intro-art\')');
}
await writeFile('src/index.html',html);
