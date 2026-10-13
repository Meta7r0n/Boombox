import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('src/easter-eggs.js','utf8'),secretTunes=JSON.parse(await readFile('secrets/tunes.json','utf8'));
const phone={hidden:false},code={value:'12345678'},hits=[];let clock=10000;
const context=vm.createContext({secretTunes,profileBusy:false,profileBooting:false,secretBusy:false,secretKeys:'',secretKeyTime:0,Date:{now:()=>clock},$:id=>id==='#phone-view'?phone:code,discoverSecret:match=>hits.push(match)});
vm.runInContext(source.slice(source.indexOf('function resetSecretKeys()'),source.indexOf('function installSecrets('))+source.slice(source.indexOf('function hearSecretKey('),source.indexOf('async function discoverSecret(')),context);
const press=key=>{context.key=key;return vm.runInContext('hearSecretKey(key)',context)},reset=()=>vm.runInContext('resetSecretKeys()',context);
for(const [id,sequences] of Object.entries(secretTunes))for(const sequence of sequences){reset();const before=hits.length;for(const key of sequence)press(key);assert.equal(hits.length,before+1);assert.equal(hits.at(-1).id,id);assert.equal(code.value,'');assert.equal(context.secretKeys,'')}
reset();for(const key of '1199')assert.equal(press(key),false);assert.equal(press('#'),true);assert.equal(press('#'),true);const before=hits.length;for(const key of '96633221')press(key);assert.equal(hits.length,before+1);assert.equal(hits.at(-1).id,'star');
for(const passcode of ['12345678','55551199','11991199']){reset();for(const key of passcode)press(key);assert.equal(press('#'),false);assert.equal(context.secretKeys,'')}
for(const key of '1199')press(key);press('*');assert.equal(press('#'),false);
for(const key of '1199')press(key);clock+=6001;assert.equal(press('#'),false);
context.profileBooting=true;assert.equal(press('3'),false);context.profileBooting=false;phone.hidden=true;assert.equal(press('3'),false);
console.log('Secret keypad: every canonical tune and alias, both Twinkle # notes, normal # submission, clear, timeout and inactive-screen isolation passed.');
