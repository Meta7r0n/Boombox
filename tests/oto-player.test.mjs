import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {otoCleanHandoff,otoValidHostMessage} from '../src/oto-core.mjs';
const parent={};
assert(otoValidHostMessage({source:parent,origin:'https://site.example',data:{channel:'oto-v1',command:'view'}},parent,['https://site.example']));
assert(!otoValidHostMessage({source:{},origin:'https://site.example',data:{channel:'oto-v1',command:'view'}},parent,['https://site.example']));
assert(!otoValidHostMessage({source:parent,origin:'https://evil.example',data:{channel:'oto-v1',command:'view'}},parent,['https://site.example']));
const payload={version:1,tapeId:'mix-1',index:2,seconds:42,logo:'音',radioId:null,session:'private'};
assert(!('session' in otoCleanHandoff(payload)));
for(const patch of [{index:-1},{seconds:Infinity},{logo:'OTHER'},{radioId:{}},{version:2}])assert.equal(otoCleanHandoff({...payload,...patch}),null);
class Element {
  constructor(){this.events={};this.dataset={};this.style={setProperty(){},removeProperty(){}};this.classList={add(){}};this.paused=false;this.currentTime=42;this.duration=100;this.volume=.65;}
  addEventListener(type,fn){(this.events[type]||=[]).push(fn)}
  removeEventListener(){}
  emit(type,event={}){for(const fn of this.events[type]||[])fn(event)}
  setAttribute(key,value){this[key]=value}
  append(el){this.child=el;el.contentWindow={postMessage(){}};this.appends=(this.appends||0)+1}
  remove(){}
  pause(){this.paused=true;this.emit('pause')}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
const audio=new Element(),root=new Element(),messages=[],opened=[],handlers={};
const store=new Map();
class Channel {constructor(){this.events={};Channel.last=this}addEventListener(type,fn){this.events[type]=fn}postMessage(value){this.sent=value}}
const window=new Element();Object.assign(window,{OTO_CONFIG:{parentOrigins:['https://site.example','https://player.example']},parent:{postMessage:(...args)=>messages.push(args)},open:(...args)=>{opened.push(args);return{}},dispatchEvent(){}});
const sandbox={window,document:{documentElement:root,referrer:'https://site.example/home'},location:{origin:'https://player.example',href:'https://player.example/app/?embed=1',search:'?embed=1'},URL,URLSearchParams,crypto,BroadcastChannel:Channel,
  sessionStorage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k),removeItem:k=>store.delete(k)},navigator:{mediaSession:{setActionHandler:(action,fn)=>handlers[action]=fn}},
  $:get,musicAudio:audio,state:{logo:'音',logoPicked:true},currentSong:()=>({title:'Test song'}),loadedTape:{id:'mix-1',title:'Test tape'},starterTape:{id:'starter'},savedCassettes:[],musicIndex:2,musicQueue:[{}],radioListening:null,radioHostSession:null,profileBooting:false,displayActive:false,
  radioLabel:()=> 'FM 88.8',toast(){},introClose(){},previousMusic(){},nextMusic(){},openOtoLogoPicker(){},exitRadioDisplay(){},applyPatch(){},playMusic:async()=>{audio.paused=false},syncRadioProgram:async()=>{}};
vm.createContext(sandbox);
const core=(await readFile('src/oto-core.mjs','utf8')).replaceAll('export ','');
vm.runInContext(core+'\n'+await readFile('src/oto-player.js','utf8'),sandbox);
assert.equal(root.dataset.otoView,'dock');
get('#oto-expand').emit('click');assert.equal(root.dataset.otoView,'expanded');
get('#oto-expand').emit('click');assert.equal(root.dataset.otoView,'dock');assert.equal(audio.currentTime,42);assert.equal(audio.paused,false);
window.emit('message',{source:window.parent,origin:'https://evil.example',data:{channel:'oto-v1',command:'view',view:'expanded'}});assert.equal(root.dataset.otoView,'dock');
window.emit('message',{source:window.parent,origin:'https://site.example',data:{channel:'oto-v1',command:'view',view:'expanded'}});assert.equal(root.dataset.otoView,'expanded');
get('#oto-popout').emit('click');assert.match(opened[0][0],/\/app\/\?popout=1/);assert.equal(JSON.parse(store.get('oto-popout')).seconds,42);assert.equal(audio.paused,false);
window.emit('message',{source:{},origin:'https://player.example',data:{channel:'oto-v1',type:'popout-playing'}});assert.equal(audio.paused,false);
window.emit('message',{source:vm.runInContext('otoPopup',sandbox),origin:'https://player.example',data:{channel:'oto-v1',type:'popout-playing'}});assert.equal(audio.paused,true);audio.paused=false;
Channel.last.events.message({data:{type:'claim',id:'different-player'}});assert.equal(audio.paused,true);
sandbox.radioListening={station:{}};vm.runInContext('otoPauseLocal()',sandbox);assert.equal(vm.runInContext('radioLocalPaused',sandbox),true);
const before=opened.length;sandbox.radioHostSession={id:'broadcast'};get('#oto-popout').emit('click');assert.equal(opened.length,before);
// Embedding creates one iframe and keeps that exact iframe through view changes.
const body=new Element(),script={src:'https://player.example/oto/embed.js',dataset:{player:'https://player.example/app/'},hasAttribute:()=>false};
const embedWindow=new Element();embedWindow.dispatchEvent=()=>{};
const embedSandbox={window:embedWindow,document:{currentScript:script,body,documentElement:root,createElement:()=>new Element()},location:{href:'https://site.example/'},URL,matchMedia:()=>({matches:false}),CustomEvent:class{}};
vm.createContext(embedSandbox);vm.runInContext(await readFile('public/oto/embed.js','utf8'),embedSandbox);
const original=body.child;embedWindow.oto.expand();embedWindow.oto.minimize();embedWindow.oto.dock('top');
assert.equal(body.child,original);assert.equal(body.appends,1);assert.equal(original.style.top,'0');assert.equal(embedWindow.OtoPlayer.mount({container:body}),embedWindow.oto);
assert.equal(original.src,'https://player.example/app/?embed=1');
// Required branding rejects unsupported choices and persists as design fields.
const html=await readFile('src/index.html','utf8');
new vm.Script(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
assert(html.includes("logo:['oto','音']"));assert(html.includes("boolKeys=['logoPicked'"));
assert((await readFile('src/music.js','utf8')).includes('if(!state.logoPicked){openOtoLogoPicker'));
assert(html.includes('if(!state.logoPicked){openOtoLogoPicker(()=>{introClose();void enterRadioDisplay'));
console.log('oto player passed: stable iframe/audio across dock changes, strict message origin/source checks, safe handoff, exclusive playback, host guard and required logos.');

// Plaque drawing must reset the fill after the dark plaque is painted.
const branding=await readFile('src/branding.js','utf8');
const drawCode=branding.slice(branding.indexOf('function drawStereoLogo'),branding.indexOf('function openOtoLogoPicker'));
let ink;const c={save(){},restore(){},translate(){},fillText(){ink=this.fillStyle}};
const art={rect(ctx){ctx.fillStyle='#193738';},Path2D:class{}};vm.createContext(art);vm.runInContext(drawCode,art);art.drawStereoLogo(c,{logo:'oto',outline:3},10,30,20);assert.equal(ink,'#f4ecd7');

// Splash customization safely closes even if the preview focus target is absent.
const profileCode=await readFile('src/profiles.js','utf8');
const custom=profileCode.match(/\$\('#enter-customize'\)\.addEventListener\('click',(\(\)=>\{[^}]*\})\);/)[1];
const splash={introClose(){},$(){return null}};vm.createContext(splash);vm.runInContext('('+custom+')()',splash);
