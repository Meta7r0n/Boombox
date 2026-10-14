import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDeviceLibrary} from '../src/device-library.mjs';
const catalog=JSON.parse(await readFile('music/catalog.json','utf8')),secretCatalog=JSON.parse(await readFile('music/secrets.json','utf8')),tunes=JSON.parse(await readFile('secrets/tunes.json','utf8'));
const stores=new Map(['profiles','sessions','tracks','cassettes'].map(s=>[s,new Map()]));let fail=false;
const store={get:async(s,id)=>structuredClone(stores.get(s).get(id)),all:async s=>structuredClone([...stores.get(s).values()]),commit:async commands=>{
 if(fail)throw Error('Storage full');const copy=new Map([...stores].map(([s,rows])=>[s,new Map(rows)]));
 for(const command of commands){const rows=copy.get(command.store);if(command.remove)rows.delete(command.id);else{if(command.add&&rows.has(command.value.id))throw Error('Duplicate');rows.set(command.value.id,structuredClone(command.value));}}
 for(const [s,rows]of copy)stores.set(s,rows);
}};
const newApp=()=>createDeviceLibrary({store,crypto,catalog,secretCatalog,tunes,makeURL:blob=>URL.createObjectURL(blob)});
let app=newApp();const call=(path,data,session)=>app.handle('/api/'+path,data?{method:'POST',body:JSON.stringify(data)}:{},session);
const guestId=crypto.randomUUID();await call('cassettes',{id:guestId,title:'Guest mix',color:'#aabbcc',tracks:[catalog[0].id]});
const a=await call('profile/create',{name:'Alice',code:'12345678'});assert(a.session);assert(!JSON.stringify([...stores.get('profiles').values()]).includes('12345678'));
assert.equal((await call('library',null,a.session)).cassettes[0].id,guestId);
const form=new FormData();const uploadId=crypto.randomUUID();form.append('audio',new Blob(['ID3','test audio'],{type:'audio/mpeg'}),'device.mp3');form.append('id',uploadId);form.append('title','Device song');form.append('duration','30');
const upload=await app.handle('/api/tracks',{method:'POST',body:form},a.session);assert.equal(upload.track.source,'upload');
const id=crypto.randomUUID();const draft={id,title:'Persistent tape',color:'#ee9944',tracks:[uploadId,catalog[0].id,uploadId]};
const saved=await call('cassettes',draft,a.session);assert.deepEqual(saved.cassette.tracks.map(t=>t.id),draft.tracks);
assert.equal((await call('cassettes',draft,a.session)).cassette.id,id);
await call('profile/save',{theme:'dark',design:{logo:'音',logoPicked:true,name:'My radio'}},a.session);
await call('profile/discover',{sequence:tunes.farm[0]},a.session);
// A new runtime (the equivalent of reload) reconstructs music from stored blobs.
app=newApp();const reconnect=await call('profile/unlock',{code:'12345678'});assert.equal(reconnect.profile.id,a.profile.id);assert.equal(reconnect.profile.design.logo,'音');assert(reconnect.profile.secretUnlocks.includes('farm'));
const library=await call('library',null,reconnect.session);const tape=library.cassettes.find(t=>t.id===id);assert.equal(tape.tracks.length,3);assert.deepEqual(tape.tracks.map(t=>t.id),draft.tracks);
const audio=await (await fetch(library.tracks[0].url)).text();assert.equal(audio,'ID3test audio');
await call('profile/lock',{},reconnect.session);await assert.rejects(call('library',null,reconnect.session));
const b=await call('profile/create',{name:'Bob',code:'87654321'});assert.equal((await call('library',null,b.session)).cassettes.length,0);
await assert.rejects(call('cassettes',{...draft,id:crypto.randomUUID()},b.session));
await assert.rejects(call('profile/unlock',{code:'11111111'}));
fail=true;await assert.rejects(call('cassettes',{...draft,id:crypto.randomUUID()},a.session));fail=false;
assert.equal((await call('library',null,a.session)).cassettes.length,2);
await assert.rejects(call('radio/start',{},a.session));assert((await call('phone/inbox',null,a.session)).messages.length===0);
const html=await readFile('index.html','utf8');assert(html.includes('window.OTO_LOCAL_MODE=true'));assert(!/http-equiv="refresh"/i.test(html));assert(!html.includes('boombox-atelier.meta7r0n.chatgpt.site'));
assert(html.includes('./public/music/'));assert(html.includes('./public/secrets/'));assert(html.includes('createIndexedDeviceStore'));
console.log('Device edition passed: profile-linked durable records, saved blobs, reload/reconnect, ordered/idempotent cassettes, isolation, secrets, storage failure recovery and no sign-in redirect.');
