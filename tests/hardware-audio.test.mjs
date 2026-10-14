import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const hardware=await readFile('src/hardware.js','utf8'),music=await readFile('src/music.js','utf8');
let contexts=0,sources=0,resumes=0,playCalls=0,claimsBeforePlayback=0,channelChanges=0;
class Param{constructor(value=0){this.value=value;this.targets=[]}setTargetAtTime(v,time,tau){this.value=v;this.targets.push([v,time,tau])}}
class Node{constructor(){this.connections=[];this.gain=new Param(1);this.frequency=new Param();this.Q=new Param();this.pan=new Param();this._channels=2;this._mode='max'}connect(n){this.connections.push(n);return n}set channelCount(v){channelChanges++;this._channels=v}get channelCount(){return this._channels}set channelCountMode(v){channelChanges++;this._mode=v}get channelCountMode(){return this._mode}}
class Audio{constructor(){contexts++;this.state='suspended';this.currentTime=4;this.sampleRate=48000;this.destination=new Node()}createBiquadFilter(){return new Node()}createGain(){return new Node()}createStereoPanner(){return new Node()}createMediaElementSource(){sources++;if(!playCalls)claimsBeforePlayback++;return new Node()}async resume(){resumes++;this.state='running'}}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:true,setAttribute(){}});return elements.get(id)};
const media={paused:true,currentTime:23,volume:.65,playbackRate:1,muted:false,pause(){this.paused=true},ended:false,getAttribute:()=>'/music/fixture.mp3',async play(){playCalls++;this.paused=false},load(){throw Error('EQ must not reload audio')}};
let logoRequests=0;
const sandbox={state:{logoPicked:false},openOtoLogoPicker(){logoRequests++},window:{AudioContext:Audio},navigator:{audioSession:{type:'auto'}},console,musicAudio:media,$:get,clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),hardwareReady:true,hardwareConfig:()=>({eq:5}),currentSong:()=>({title:'Fixture',url:'/music/fixture.mp3'}),stopAudio(){},hardwareChanged(){},hardwareAnnounce(){},hardwareReading(){return "EQ"},showHardwareReading(){},setMusicStatus(){},syncMusicPlayer(){},syncMusicProgress(){},seekMusic(){},displayActive:false,musicRepeat:false,profileSession:'',musicRevision:0,phoneAudio:null,hardwareAudio:null,hardwareLive:{bass:0,treble:0,balance:0,eq:Array(7).fill(0),switches:Array(8).fill(false)}};
const context=vm.createContext(sandbox),run=s=>vm.runInContext(s,context);
run(hardware.slice(hardware.indexOf('function hardwareSound()'),hardware.indexOf('function hardwareChanged(')));
run(hardware.slice(hardware.indexOf('function setHardwareValue('),hardware.indexOf('function hardwareReading(')));
run(music.slice(music.indexOf('async function playMusic('),music.indexOf('function toggleMusic(')));
await run('playMusic()');assert.equal(logoRequests,1);assert.equal(media.paused,true);assert.equal(sources,0);sandbox.state.logoPicked=true;
await run('playMusic()');assert.equal(media.paused,false);assert.equal(sources,1);assert.equal(contexts,1);assert.equal(claimsBeforePlayback,1);assert.equal(resumes,1);assert.equal(sandbox.navigator.audioSession.type,'playback');assert.equal(sandbox.hardwareAudio.mono.gain.value,1);
const source=sandbox.hardwareAudio.source,initialChannels=channelChanges;
for(let band=0;band<5;band++)for(let gain=-12;gain<=12;gain++){run(`setHardwareValue({kind:'eq',key:${band},label:'EQ'},${gain})`);assert.equal(sandbox.hardwareAudio.eq[band].gain.value,gain);assert.equal(media.paused,false);assert.equal(media.currentTime,23);assert.equal(media.muted,false)}
assert.equal(sources,1);assert.equal(contexts,1);assert.equal(channelChanges,initialChannels);assert.equal(resumes,1);assert.equal(sandbox.hardwareAudio.source,source);assert(source.connections.includes(sandbox.hardwareAudio.bass));assert.equal(sandbox.hardwareAudio.eq[5].gain.value,0);
const scheduled=sandbox.hardwareAudio.eq[0].gain.targets.length;run('applyHardwareSound()');assert.equal(sandbox.hardwareAudio.eq[0].gain.targets.length,scheduled);
sandbox.hardwareAudio.context.state='interrupted';await run('resumeHardwareSound()');assert.equal(resumes,2);assert.equal(sources,1);assert.equal(sandbox.hardwareAudio.context.state,'running');
run('setHardwareValue({kind:"eq",key:0,label:"EQ"},NaN)');assert.equal(sandbox.hardwareLive.eq[0],12);
// Output controls must be reversible and never turn decorative ports into mute.
run(hardware.slice(hardware.indexOf('function hardwarePress('),hardware.indexOf('function openHardwareDeck(')));
run("hardwarePress({kind:'port',key:0,label:'Headphones',id:'port-0'})");assert.equal(media.muted,false);assert.equal(media.paused,false);assert.equal(media.currentTime,23);
run("hardwarePress({kind:'switch',key:7,label:'Power',id:'switch-7'})");assert.equal(media.paused,true);assert.equal(sandbox.hardwareLive.power,false);
run("hardwarePress({kind:'switch',key:7,label:'Power',id:'switch-7'})");await new Promise(r=>setTimeout(r,0));assert.equal(media.paused,false);assert.equal(sandbox.hardwareLive.power,true);assert.equal(sandbox.hardwareLive.switches[7],false);
run("hardwarePress({kind:'switch',key:1,label:'Mute',id:'switch-1'})");assert.equal(media.muted,true);
run("setHardwareValue({kind:'knob',key:'volume',label:'Volume'},50)");assert.equal(media.muted,false);assert.equal(sandbox.hardwareLive.switches[1],false);
sandbox.refreshHandbook=()=>{};
const book=await readFile('src/handbook.js','utf8');run(book.slice(book.indexOf('async function restoreHardwareSound('),book.indexOf("for(const id of ['handbook-open'")));
media.volume=0;media.muted=true;media.playbackRate=.5;sandbox.hardwareLive.balance=1;sandbox.hardwareLive.bass=-12;sandbox.hardwareLive.eq.fill(-12);sandbox.hardwareLive.switches.fill(true);
await run('restoreHardwareSound()');assert.equal(media.paused,false);assert.equal(media.currentTime,23);assert.equal(media.volume,.65);assert.equal(media.muted,false);assert.equal(media.playbackRate,1);assert.equal(sandbox.hardwareLive.balance,0);assert(sandbox.hardwareLive.eq.every(v=>v===0));assert.equal(sources,1);
// A setup error before the source is claimed must preserve native playback.
sandbox.hardwareAudio=null;sandbox.phoneAudio=null;class Unsupported extends Audio{createBiquadFilter(){throw Error('Unsupported filter')}}sandbox.window.AudioContext=Unsupported;const before=sources;assert.equal(run('hardwareSound()'),null);assert.equal(sources,before);assert.equal(media.paused,false);
console.log(JSON.stringify({status:'passed',coverage:['graph ready before playback','125 live EQ changes without source recreation or mute/pause/seek','one shared phone/music context','smoothed parameter changes','stable channel configuration','interrupted context resume','partial setup preserves native playback','invalid values ignored','headphone jack preserves sound','reversible power and volume unmute','neutral sound recovery preserves song position and audio source']}));
