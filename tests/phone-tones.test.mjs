import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('src/profiles.js','utf8');
let contexts=0,resumes=0,notes=[],gains=[];
class AudioContext{
 constructor(){contexts++;this.state='suspended';this.currentTime=10;this.destination={}}
 async resume(){resumes++;this.state='running'}
 createGain(){const points=[];gains.push(points);return {gain:{setValueAtTime:(...x)=>points.push(x),linearRampToValueAtTime:(...x)=>points.push(x)},connect(){},disconnect(){}}}
 createOscillator(){const note={frequency:{}};notes.push(note);return Object.assign(note,{connect(){},disconnect(){},start:t=>note.start=t,stop:t=>note.stop=t})}
}
const sandbox=vm.createContext({window:{AudioContext}});vm.runInContext(source.slice(source.indexOf('let phoneAudio='),source.indexOf('const guiThemes=')),sandbox);
for(const key of '123456789*0#')await vm.runInContext(`playPhoneTone('${key}')`,sandbox);
assert.equal(contexts,1);assert.equal(resumes,1);assert.equal(notes.length,24);
assert.deepEqual(notes.slice(0,2).map(n=>n.frequency.value),[697,1209]);assert.deepEqual(notes.slice(-2).map(n=>n.frequency.value),[941,1477]);
assert(notes.every(n=>n.stop-n.start<.14&&n.type==='sine'));assert(gains.every(g=>g[0][0]===0&&g.at(-1)[0]===0));
sandbox.window={};await vm.runInContext("playPhoneTone('1')",sandbox);
console.log('Phone keypad: all 12 DTMF keys, shared context, resume, soft envelopes and unsupported-browser fallback passed.');
