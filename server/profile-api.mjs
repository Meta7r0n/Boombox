import {ensureCallingLine} from './phone-line.mjs';
import secretTunes from '../secrets/tunes.json' with {type:'json'};
const themes=['original','dark','pc','reverse'];
const json=(data,status=200,cookie)=>Response.json(data,{status,headers:{'cache-control':'private, no-store',...(cookie?{'set-cookie':cookie}:{})}});
const sql=(e,q,...v)=>e.DB.prepare(q).bind(...v);
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async v=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
async function hash(code,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
const cookie=(token='',age=2592000)=>'atelier_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;
const token=r=>r.headers.get('x-atelier-session')?.match(/^[a-f0-9]{64}$/)?.[0]||r.headers.get('cookie')?.match(/(?:^|;\s*)atelier_session=([a-f0-9]{64})/)?.[1];
const discoveries=async(e,id)=>(await sql(e,'SELECT DISTINCT egg_id FROM player_secret_discoveries WHERE profile_id=?',id).all()).results.map(r=>r.egg_id);
const publicProfile=async(e,p)=>({id:p.id,name:p.name,theme:p.theme,design:p.design?JSON.parse(p.design):null,secretUnlocks:await discoveries(e,p.id),callingCode:await ensureCallingLine(e,p)});
export async function activeProfile(request,env){const t=token(request);if(!t)return null;const p=await sql(env,'SELECT p.* FROM player_profiles p JOIN player_sessions s ON p.id=s.profile_id WHERE s.token_hash=? AND s.owner=? AND s.expires_at>?',await digest(t),request.headers.get('oai-authenticated-user-id'),Date.now()).first();if(!p)throw Object.assign(new Error('Your profile is locked. Enter your passcode again.'),{status:401});return p}
export async function resolveMusicOwner(request,env){const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return null;const p=await activeProfile(request,env);const expected=request.headers.get('x-atelier-profile');if(expected&&p?.id!==expected)throw Object.assign(new Error('Reconnect your telephone profile before saving or loading music.'),{status:401});return p?owner+':profile:'+p.id:owner}
export async function handleProfileRequest(request,env){try{
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return json({error:'Sign in to open your profiles.'},401);if(!env.DB)return json({error:'Profiles are temporarily unavailable.'},503);
 const url=new URL(request.url),action=url.pathname.split('/').pop();
 if(request.method==='GET') {let p;try{p=await activeProfile(request,env)}catch(e){if(e.status===401)return json({profile:null},200,cookie('',0));throw e}return json({profile:p?await publicProfile(env,p):null})}
 if(request.method!=='POST')return json({error:'Unavailable action.'},405);
 if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==url.origin))return json({error:'Open the app directly to use profiles.'},403);
 if(action==='recover'){const p=await activeProfile(request,env);if(!p)return json({error:'Connect your telephone profile first.'},401);await env.DB.batch([sql(env,'UPDATE music_tracks SET owner=? WHERE owner=?',owner+':profile:'+p.id,owner),sql(env,'UPDATE music_cassettes SET owner=? WHERE owner=?',owner+':profile:'+p.id,owner)]);return json({recovered:true})}
 if(action==='lock'){if(token(request))await sql(env,'DELETE FROM player_sessions WHERE token_hash=? AND owner=?',await digest(token(request)),owner).run();return json({profile:null},200,cookie('',0))}
 if(Number(request.headers.get('content-length'))>20000)return json({error:'Profile settings are too large.'},413);
 const data=await request.json();
 if(action==='discover'){const p=await activeProfile(request,env);if(!p)return json({error:'Connect your telephone profile to keep this discovery.'},401);const match=Object.entries(secretTunes).find(([id,tunes])=>tunes.includes(data.sequence));if(!match)return json({error:'The tune did not connect.'},400);const ids=match[0]==='twilight'?Object.keys(secretTunes):[match[0]];await env.DB.batch(ids.map(id=>sql(env,'INSERT INTO player_secret_discoveries (profile_id,egg_id,discovered_at) VALUES (?,?,?) ON CONFLICT DO NOTHING',p.id,id,Date.now())));return json({unlocks:await discoveries(env,p.id),discovered:match[0]})}
 if(action==='save'){const p=await activeProfile(request,env);if(!p)return json({error:'Enter your passcode first.'},401);if(!themes.includes(data.theme))return json({error:'Choose an interface theme.'},400);const design=data.design;if(!design||Array.isArray(design)||typeof design!=='object'||JSON.stringify(design).length>12000)return json({error:'The design could not be saved.'},400);if(Object.hasOwn(design,'logo')&&!['oto','音'].includes(design.logo))return json({error:'Choose the oto or 音 stereo logo.'},400);await sql(env,'UPDATE player_profiles SET theme=?,design=? WHERE id=? AND owner=?',data.theme,JSON.stringify(design),p.id,owner).run();return json({saved:true})}
 if(!['create','unlock'].includes(action))return json({error:'Unavailable action.'},404);
 const attempts=await sql(env,'SELECT * FROM player_attempts WHERE owner=?',owner).first();if(attempts?.blocked_until>Date.now())return json({error:'Too many attempts. Try again in five minutes.'},429);
 if(typeof data.code!=='string'||!/^\d{8}$/.test(data.code))return json({error:'Enter an eight-digit passcode.'},400);
 const profiles=(await sql(env,'SELECT * FROM player_profiles WHERE owner=?',owner).all()).results;let matched=null;
 for(const p of profiles)if(await hash(data.code,p.salt)===p.passcode_hash)matched=p;
 let p=matched;
 if(action==='create'){
  if(matched)return json({error:'This passcode is already in use. Choose another.'},409);
  if(profiles.length>=10)return json({error:'You already have ten profiles.'},400);
  if(typeof data.name!=='string'||!data.name.trim()||data.name.trim().length>24)return json({error:'Enter a player name of 1–24 characters.'},400);
  const salt=random(),id=crypto.randomUUID();p={id,owner,name:data.name.trim(),salt,passcode_hash:await hash(data.code,salt),theme:'original',design:null};
  const commands=[sql(env,'INSERT INTO player_profiles (id,owner,name,salt,passcode_hash,theme,design) VALUES (?,?,?,?,?,?,?)',id,owner,p.name,salt,p.passcode_hash,p.theme,null)];
  if(!profiles.length)commands.push(sql(env,'UPDATE music_tracks SET owner=? WHERE owner=?',owner+':profile:'+id,owner),sql(env,'UPDATE music_cassettes SET owner=? WHERE owner=?',owner+':profile:'+id,owner));
  await env.DB.batch(commands);
 }else if(!p){const failures=(attempts?.failures||0)+1;await sql(env,'INSERT INTO player_attempts (owner,failures,blocked_until) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until',owner,failures>=5?0:failures,failures>=5?Date.now()+300000:0).run();return json({error:'That passcode did not connect. Try again.'},401)}
 await sql(env,'DELETE FROM player_attempts WHERE owner=?',owner).run();await sql(env,'DELETE FROM player_sessions WHERE expires_at<?',Date.now()).run();
 const session=random();await sql(env,'INSERT INTO player_sessions (token_hash,owner,profile_id,expires_at) VALUES (?,?,?,?)',await digest(session),owner,p.id,Date.now()+2592000000).run();return json({profile:await publicProfile(env,p),session},200,cookie(session));
 }catch(e){return json({error:e.status?e.message:'Profiles could not load or save. Please try again.'},e.status||503)}}
