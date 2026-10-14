// Durable device storage for the standalone GitHub Pages edition.
export function createIndexedDeviceStore(indexedDB, name='oto-device-library-v1') {
  let opening;
  const open = () => opening ||= new Promise((resolve,reject) => {
    if (!indexedDB) {reject(Error('Device storage is unavailable. Open this page in a regular browser.'));return;}
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>{for(const store of ['profiles','sessions','tracks','cassettes'])request.result.createObjectStore(store,{keyPath:'id'});};
    request.onerror=()=>{opening=null;reject(Error('Device storage could not open. Your saved data has not been changed.'));};
    request.onblocked=()=>{opening=null;reject(Error('Close older oto tabs and try again to open device storage.'));};
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
  });
  async function run(stores,mode,work) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      let tx;try{tx=db.transaction(stores,mode,{durability:'strict'});}catch{tx=db.transaction(stores,mode);}
      let result;
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(Error(tx.error?.name==='QuotaExceededError'?'Device storage is full. Your draft is still here. Free some browser storage and try again.':'The save did not complete. Your draft is still here; try again.'));
      tx.onerror=()=>{};
      work(tx,value=>{result=value;});
    });
  }
  return {
    get:(store,id)=>run([store],'readonly',(tx,set)=>{tx.objectStore(store).get(id).onsuccess=e=>set(e.target.result);}),
    all:store=>run([store],'readonly',(tx,set)=>{tx.objectStore(store).getAll().onsuccess=e=>set(e.target.result);}),
    commit:commands=>run([...new Set(commands.map(c=>c.store))],'readwrite',tx=>{for(const command of commands){const store=tx.objectStore(command.store);if(command.remove)store.delete(command.id);else store[command.add?'add':'put'](command.value);}})
  };
}

export function createDeviceLibrary({store,crypto,catalog,secretCatalog=[],tunes={},now=()=>Date.now(),makeURL=blob=>URL.createObjectURL(blob)}) {
  const urls=new Map();
  const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
  const digest=async text=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
  const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
  async function hash(code,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
  const publicProfile=p=>({id:p.id,name:p.name,theme:p.theme,design:p.design,secretUnlocks:p.secretUnlocks||[],callingCode:null});
  const title=(text,max)=>{if(typeof text!=='string'||!text.trim()||text.trim().length>max)throw Error('Enter a name of 1–'+max+' characters.');return text.trim();};
  const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(value);
  async function active(session){if(!session)return null;const row=await store.get('sessions',await digest(session));if(!row||row.expires<now())throw Error('Your profile is locked. Enter your passcode again.');return (await store.get('profiles',row.profileId))||null;}
  function publicTrack(track){let url=urls.get(track.id);if(!url){url=makeURL(track.blob);urls.set(track.id,url);}return {id:track.id,title:track.title,artist:'Your upload',filename:track.filename,duration:track.duration,bytes:track.blob.size,source:'upload',url};}
  async function songs(profile){return [...catalog,...secretCatalog.filter(t=>profile?.secretUnlocks?.includes(t.egg)),...(await store.all('tracks')).filter(t=>t.profileId===(profile?.id||'guest')).map(publicTrack)];}
  async function cassette(row,profile){const map=new Map((await songs(profile)).map(t=>[t.id,t]));return {id:row.id,title:row.title,color:row.color,createdAt:row.createdAt,tracks:row.tracks.map(id=>map.get(id)).filter(Boolean)};}
  let chain=Promise.resolve();
  async function handle(path,options={},session='') {
    const url=new URL(path,'https://device.invalid'),action=url.pathname.split('/').pop(),method=options?.method||'GET';
    let profile;try{profile=await active(session);}catch(error){if(action!=='current'&&action!=='unlock'&&action!=='create')throw error;profile=null;}
    const owner=profile?.id||'guest';
    let data={};if(typeof options?.body==='string')try{data=JSON.parse(options.body);}catch{throw Error('This save could not be read.');}
    if(url.pathname==='/api/profile/current')return {profile:profile?publicProfile(profile):null};
    if(url.pathname==='/api/profile/lock'){if(session)await store.commit([{store:'sessions',id:await digest(session),remove:true}]);return {profile:null};}
    if(url.pathname.startsWith('/api/profile/')&&['create','unlock'].includes(action)){
      if(!/^\d{8}$/.test(data.code||''))throw Error('Enter an eight-digit passcode.');
      const profiles=await store.all('profiles');let matched;
      for(const p of profiles)if(await hash(data.code,p.salt)===p.passcodeHash)matched=p;
      if(action==='create'&&matched)throw Error('This passcode is already in use on this device. Choose another.');
      if(action==='unlock'&&!matched)throw Error('That passcode did not connect on this device.');
      if(action==='create'&&profiles.length>=10)throw Error('This device already has ten profiles.');
      const salt=action==='create'?random():matched.salt;
      const p=matched||{id:crypto.randomUUID(),name:title(data.name,24),salt,passcodeHash:await hash(data.code,salt),theme:'original',design:null,secretUnlocks:[]};
      const token=random(),commands=[{store:'sessions',value:{id:await digest(token),profileId:p.id,expires:now()+2592000000}}];
      if(action==='create'){commands.push({store:'profiles',value:p,add:true});if(!profiles.length)for(const storeName of ['tracks','cassettes'])for(const item of await store.all(storeName))if(item.profileId==='guest')commands.push({store:storeName,value:{...item,profileId:p.id}});}
      await store.commit(commands);return {profile:publicProfile(p),session:token};
    }
    if(url.pathname==='/api/profile/save'){
      if(!profile)throw Error('Enter your device profile passcode first.');
      if(!['original','dark','pc','reverse'].includes(data.theme)||!data.design||Array.isArray(data.design)||JSON.stringify(data.design).length>12000)throw Error('The design could not be saved.');
      if(data.design.logo&&!['oto','音'].includes(data.design.logo))throw Error('Choose the oto or 音 stereo logo.');
      await store.commit([{store:'profiles',value:{...profile,theme:data.theme,design:data.design}}]);return {saved:true};
    }
    if(url.pathname==='/api/profile/discover'){
      if(!profile)throw Error('Connect your device profile to keep this discovery.');
      const match=Object.entries(tunes).find(([,sequences])=>sequences.includes(data.sequence));if(!match)throw Error('The tune did not connect.');
      const unlocks=[...new Set([...(profile.secretUnlocks||[]),...(match[0]==='twilight'?Object.keys(tunes):[match[0]])])];
      await store.commit([{store:'profiles',value:{...profile,secretUnlocks:unlocks}}]);return {unlocks,discovered:match[0]};
    }
    if(url.pathname==='/api/profile/recover'){
      if(!profile)throw Error('Connect your device profile first.');const commands=[];
      for(const s of ['tracks','cassettes'])for(const row of await store.all(s))if(row.profileId==='guest')commands.push({store:s,value:{...row,profileId:owner}});
      if(commands.length)await store.commit(commands);return {recovered:true};
    }
    if(url.pathname==='/api/library'){
      const tracks=(await store.all('tracks')).filter(t=>t.profileId===owner).map(publicTrack),rows=(await store.all('cassettes')).filter(t=>t.profileId===owner).sort((a,b)=>b.createdAt-a.createdAt);
      return {profileId:profile?.id||null,tracks,cassettes:await Promise.all(rows.map(row=>cassette(row,profile))),secretTracks:secretCatalog.filter(t=>profile?.secretUnlocks?.includes(t.egg)),unassignedCassettes:profile?(await store.all('cassettes')).filter(t=>t.profileId==='guest').length:0};
    }
    if(url.pathname==='/api/tracks'&&method==='POST'){
      const form=options.body,file=form?.get?.('audio'),id=form?.get?.('id'),duration=Number(form?.get?.('duration'));
      if(!uuid(id)||!file?.size||typeof file.slice!=='function'||file.size>50*1024*1024||!Number.isFinite(duration)||duration<=0||duration>86400)throw Error('Choose a readable MP3 or WAV smaller than 50 MB.');
      const existing=await store.get('tracks',id);if(existing){if(existing.profileId!==owner)throw Error('This upload belongs to another device profile.');return {track:publicTrack(existing)};}
      const head=new Uint8Array(await file.slice(0,16).arrayBuffer()),ascii=(a,b)=>String.fromCharCode(...head.slice(a,b));
      if(!(ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE')&&!(ascii(0,3)==='ID3'||head[0]===255&&(head[1]&224)===224))throw Error('This file is not an MP3 or WAV.');
      const track={id,profileId:owner,title:title(form.get('title'),120),filename:String(file.name||'audio').slice(0,255),duration,blob:file,createdAt:now()};
      await store.commit([{store:'tracks',value:track,add:true}]);return {track:publicTrack(track)};
    }
    if(url.pathname==='/api/cassettes'&&method==='POST'){
      if(!uuid(data.id)||!/^#[a-f0-9]{6}$/i.test(data.color||'')||!Array.isArray(data.tracks)||!data.tracks.length||data.tracks.length>50)throw Error('Add 1–50 available songs and choose a cassette color.');
      const existing=await store.get('cassettes',data.id);if(existing){if(existing.profileId!==owner)throw Error('This cassette belongs to another device profile.');return {cassette:await cassette(existing,profile)};}
      const map=new Map((await songs(profile)).map(t=>[t.id,t]));if(data.tracks.some(id=>!map.has(id)))throw Error('One song is unavailable. Remove it from the draft and try again.');
      const row={id:data.id,profileId:owner,title:title(data.title,48),color:data.color,tracks:[...data.tracks],createdAt:now()};
      await store.commit([{store:'cassettes',value:row,add:true}]);return {cassette:await cassette(row,profile)};
    }
    if(url.pathname==='/api/phone/inbox')return {code:'Device only',messages:[],tapes:[],pending:[]};
    if(url.pathname.startsWith('/api/phone/')||url.pathname.startsWith('/api/radio/'))throw Error('Shared radio and tape delivery need the online edition. Your device library still works here.');
    throw Error('This action is unavailable in the device edition.');
  }
  return {handle:(...args)=>{const result=chain.catch(()=>{}).then(()=>handle(...args));chain=result;return result;}};
}
