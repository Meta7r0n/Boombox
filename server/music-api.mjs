import {resolveMusicOwner} from './profile-api.mjs';
import secretCatalog from '../music/secrets.json' with {type:'json'};
import catalog from '../music/catalog.json' with { type: 'json' };
const LIMIT=50*1024*1024;
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
class InputError extends Error { constructor(message,status=400){super(message);this.status=status} }
const statement=(env,sql,...values)=>env.DB.prepare(sql).bind(...values);
const publicTrack=t=>({id:t.id,title:t.title,artist:'Your upload',filename:t.filename,duration:t.duration,bytes:t.bytes,source:'upload',url:'/api/audio/'+t.id,...(t.mime==='audio/x-atelier-adpcm'?{codec:'atelier-adpcm'}:{})});
const publicCassette=t=>({id:t.id,title:t.title,color:t.color,tracks:JSON.parse(t.tracks),createdAt:t.created_at});
async function unlockedSongs(env,owner,siteOwner){if(!owner.startsWith(siteOwner+':profile:'))return [];const id=owner.slice((siteOwner+':profile:').length),rows=(await statement(env,'SELECT egg_id FROM player_secret_discoveries WHERE profile_id=?',id).all()).results;return secretCatalog.filter(song=>rows.some(r=>r.egg_id===song.egg))}
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const validTitle=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new InputError('Enter a name of 1–'+max+' characters.');return value.trim()};
export async function handleMusicRequest(request,env){
 try{
  const url=new URL(request.url),path=url.pathname;
  const owner=await resolveMusicOwner(request,env);
  if(!owner)return json({error:'Sign in to open your saved music library.'},401);
  if(!env.DB||!env.BUCKET)return json({error:'Your saved library is temporarily unavailable. Your draft is still here.'},503);
  if(request.method==='POST'&&(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)))return json({error:'Open the app directly to save music.'},403);
  if(path==='/api/library'&&request.method==='GET'){
   const [tracks,tapes]=await env.DB.batch([
    statement(env,'SELECT * FROM music_tracks WHERE owner = ? ORDER BY created_at DESC',owner),
    statement(env,'SELECT * FROM music_cassettes WHERE owner = ? ORDER BY created_at DESC',owner)]);
   const siteOwner=request.headers.get('oai-authenticated-user-id');const profileId=owner===siteOwner?null:owner.slice((siteOwner+':profile:').length);const unassigned=profileId?await statement(env,'SELECT COUNT(*) AS count FROM music_cassettes WHERE owner=?',siteOwner).first():null;return json({profileId,unassignedCassettes:unassigned?.count||0,secretTracks:await unlockedSongs(env,owner,siteOwner),tracks:tracks.results.map(publicTrack),cassettes:tapes.results.map(publicCassette)});
  }
  if(path==='/api/tracks'&&request.method==='POST'){
   if(Number(request.headers.get('content-length'))>LIMIT+65536)throw new InputError('Choose a file smaller than 50 MB.',413);
   const form=await request.formData(),file=form.get('audio'),id=form.get('id'),duration=Number(form.get('duration'));
   if(!uuid(id))throw new InputError('The upload could not be identified. Try choosing it again.');
   const existing=await statement(env,'SELECT * FROM music_tracks WHERE id = ? AND owner = ?',id,owner).first();
   if(existing)return json({track:publicTrack(existing)});
   if(!file||typeof file==='string'||typeof file.stream!=='function'||!file.size)throw new InputError('Choose an MP3 or WAV audio file.');
   if(file.size>LIMIT)throw new InputError('Choose a file smaller than 50 MB.',413);
   if(!Number.isFinite(duration)||duration<=0||duration>86400)throw new InputError('This audio could not be read. Try a different MP3 or WAV.');
   const title=validTitle(form.get('title'),120),filename=String(file.name||'audio').slice(0,255);
   const bytes=new Uint8Array(await file.slice(0,64).arrayBuffer()),ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
   const wav=ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE';
   const mp3=ascii(0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224&&(bytes[1]&6)!==0);
   if(!wav&&!mp3)throw new InputError('This file is not an MP3 or WAV. Renaming a file does not convert it.');
   const mime=wav?'audio/wav':'audio/mpeg',object_key='music/'+encodeURIComponent(owner)+'/'+id,created_at=Date.now();
   await env.BUCKET.put(object_key,file,{httpMetadata:{contentType:mime}});
   try{await statement(env,'INSERT INTO music_tracks (id, owner, title, filename, mime, bytes, duration, object_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',id,owner,title,filename,mime,file.size,duration,object_key,created_at).run()}
   catch(e){await env.BUCKET.delete(object_key).catch(()=>{});throw e}
   return json({track:publicTrack({id,title,filename,duration,bytes:file.size})},201);
  }
  if(path==='/api/cassettes'&&request.method==='POST'){
   if(Number(request.headers.get('content-length'))>16000)throw new InputError('This mixtape is too large.',413);
   let data;try{data=await request.json()}catch{throw new InputError('The mixtape could not be read.')}
   if(!uuid(data?.id))throw new InputError('The cassette could not be identified. Try again.');
   const existing=await statement(env,'SELECT * FROM music_cassettes WHERE id = ? AND owner = ?',data.id,owner).first();
   if(existing)return json({cassette:publicCassette(existing)});
   const title=validTitle(data.title,48);
   if(typeof data.color!=='string'||!/^#[a-f0-9]{6}$/i.test(data.color))throw new InputError('Choose a cassette color.');
   if(!Array.isArray(data.tracks)||!data.tracks.length||data.tracks.length>50||data.tracks.some(id=>typeof id!=='string'||id.length>80))throw new InputError('Add 1–50 songs to your mixtape.');
   const owned=(await statement(env,'SELECT * FROM music_tracks WHERE owner = ?',owner).all()).results.map(publicTrack);
   const secrets=await unlockedSongs(env,owner,request.headers.get('oai-authenticated-user-id'));
   const map=new Map([...catalog,...owned,...secrets].map(t=>[t.id,t]));
   const tracks=data.tracks.map(id=>{const t=map.get(id);if(!t)throw new InputError('One song is unavailable. Remove it from the draft and try again.');return {id:t.id,title:t.title,artist:t.artist,duration:t.duration,url:t.url,source:t.source,...(t.codec?{codec:t.codec}:{})}});
   const created_at=Date.now();
   const write=await statement(env,'INSERT INTO music_cassettes (id, owner, title, color, tracks, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',data.id,owner,title,data.color,JSON.stringify(tracks),created_at).run();
   const saved=await statement(env,'SELECT * FROM music_cassettes WHERE id = ? AND owner = ?',data.id,owner).first();
   if(!saved)throw new InputError('This cassette could not be identified. Please create a new draft.');
   return json({cassette:publicCassette(saved)},write.meta?.changes?201:200);
  }
  const match=path.match(/^\/api\/audio\/([a-f0-9-]+)$/i);
  if(match&&(request.method==='GET'||request.method==='HEAD')){
   const track=await statement(env,'SELECT * FROM music_tracks WHERE id = ? AND owner = ?',match[1],owner).first();
   if(!track)return json({error:'This song is not in your library.'},404);
   const headers=new Headers({'content-type':track.mime,'accept-ranges':'bytes','cache-control':'private, no-store','x-content-type-options':'nosniff'});
   let range=null;
   const raw=request.headers.get('range');
   if(raw){const r=raw.match(/^bytes=(\d*)-(\d*)$/);if(!r||(!r[1]&&!r[2]))return new Response(null,{status:416,headers:{'content-range':'bytes */'+track.bytes}});
    let start=r[1]?Number(r[1]):Math.max(0,track.bytes-Number(r[2])),end=r[1]?(r[2]?Math.min(track.bytes-1,Number(r[2])):track.bytes-1):track.bytes-1;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=track.bytes||start>end)return new Response(null,{status:416,headers:{'content-range':'bytes */'+track.bytes}});
    range={offset:start,length:end-start+1};headers.set('content-range',`bytes ${start}-${end}/${track.bytes}`);
   }
   headers.set('content-length',String(range?.length??track.bytes));
   if(request.method==='HEAD')return new Response(null,{headers,status:range?206:200});
   const object=await env.BUCKET.get(track.object_key,range?{range}:undefined);
   if(!object)return json({error:'The audio file is unavailable. Try again later.'},404);
   return new Response(object.body,{headers,status:range?206:200});
  }
  return json({error:'This music action is unavailable.'},404);
 }catch(e){if(e instanceof InputError||e.status)return json({error:e.message},e.status);console.error('Music library request failed:',e?.message);return json({error:'The library could not save or load right now. Your draft is still here. Please try again.'},503)}
}
