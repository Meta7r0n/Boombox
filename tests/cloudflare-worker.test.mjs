import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {verifyAccessToken,authenticatedRequest} from '../cloudflare/auth.mjs';
import worker,{publicConfig} from '../cloudflare/worker.mjs';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'regression',alg:'RS256'};
const env={ACCESS_TEAM_DOMAIN:'https://oto-regression.cloudflareaccess.com',ACCESS_AUD:'oto-app'};
const encode=data=>Buffer.from(JSON.stringify(data)).toString('base64url');
async function signed(claims={},header={}){const head=encode({alg:'RS256',kid:'regression',...header}),body=encode({iss:env.ACCESS_TEAM_DOMAIN,aud:[env.ACCESS_AUD],sub:'user-1',email:'player@example.test',exp:Math.floor(Date.now()/1000)+300,...claims});const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(head+'.'+body))).toString('base64url');return head+'.'+body+'.'+signature;}
const fetcher=async()=>Response.json({keys:[jwk]});
const good=await signed();assert.equal((await verifyAccessToken(good,env,fetcher)).id,'access:user-1');
for(const [claims,header] of [[{exp:1},{}],[{aud:['wrong']},{}],[{iss:'https://evil.example'},{}],[{sub:''},{}],[{}, {alg:'none'}],[{}, {kid:'wrong'}]])await assert.rejects(verifyAccessToken(await signed(claims,header),env,fetcher));
const chunks=good.split('.');chunks[1]=encode({iss:env.ACCESS_TEAM_DOMAIN,aud:[env.ACCESS_AUD],sub:'victim',email:'x@example.test',exp:Date.now()/1000+300});await assert.rejects(verifyAccessToken(chunks.join('.'),env,fetcher));
await assert.rejects(verifyAccessToken(good,{},fetcher),error=>error.status===503);
const verified=await authenticatedRequest(new Request('https://player.example/api/library',{headers:{'cf-access-jwt-assertion':good,'oai-authenticated-user-id':'victim','oai-authenticated-user-email':'fake'}}),env,fetcher);
assert.equal(verified.headers.get('oai-authenticated-user-id'),'access:user-1');assert.equal(verified.headers.get('oai-authenticated-user-email'),null);
await assert.rejects(authenticatedRequest(new Request('https://player.example/api/library'),{OTO_LOCAL_AUTH:'true'}));
assert.equal((await worker.fetch(new Request('https://player.example/api/library',{headers:{'oai-authenticated-user-id':'victim'}}),{})).status,503);
assert.equal(publicConfig({SITE_ORIGIN:'javascript:alert(1)'},'https://player.example').siteOrigin,'');
const config=publicConfig({SITE_ORIGIN:'https://site.example/',SITE_PAGES:'[{"label":"Games","path":"/games"},{"label":"Bad","path":"//evil.example"}]'},'https://player.example');assert.equal(config.pages.length,1);
const page=await worker.fetch(new Request('https://player.example/app/?embed=1'),{SITE_ORIGIN:'https://site.example',ASSETS:{fetch:async()=>new Response('<head></head><body>oto</body>')}});
assert((await page.text()).includes('window.OTO_CONFIG='));assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'self' https:\/\/site.example/);
assert.equal((await worker.fetch(new Request('https://player.example/auth/login'),{})).headers.get('location'),'https://player.example/app/');
// Run the standalone entry against real temporary D1/R2 stores.
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],r2Buckets:['BUCKET'],compatibilityDate:'2026-05-15'});
try{
 const local={DB:await mf.getD1Database('DB'),BUCKET:await mf.getR2Bucket('BUCKET'),OTO_LOCAL_AUTH:'true'};
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const q of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(q.trim())await local.DB.prepare(q).run();
 const call=(path,data,session)=>worker.fetch(new Request('http://localhost:8787/api/'+path,{method:data?'POST':'GET',headers:{'oai-authenticated-user-id':'spoofed-user',...(session?{'x-atelier-session':session}:{})},...(data?{body:JSON.stringify(data)}:{})}),local);
 const profile=await (await call('profile/create',{name:'oto player',code:'87654321'})).json();assert(profile.session);
 const save=await call('profile/save',{theme:'dark',design:{logo:'音',logoPicked:true,name:'My oto'}},profile.session);assert.equal(save.status,200);
 assert.equal((await call('profile/save',{theme:'dark',design:{logo:'other'}},profile.session)).status,400);
 const reconnect=await (await call('profile/unlock',{code:'87654321'})).json();assert.equal(reconnect.profile.design.logo,'音');
 const tape=await call('cassettes',{id:crypto.randomUUID(),title:'Cloudflare mix',color:'#aabbcc',tracks:['starter-midnight-local']},reconnect.session);assert.equal(tape.status,201);
 const library=await (await call('library',null,reconnect.session)).json();assert.equal(library.cassettes[0].title,'Cloudflare mix');
 const owner=await local.DB.prepare('SELECT owner FROM player_profiles WHERE id=?').bind(profile.profile.id).first();assert.equal(owner.owner,'oto-local-developer');
}finally{await mf.dispose()}
console.log('Cloudflare entry passed: signed Access JWTs, rejected forgeries/wrong audiences, identity stripping, local-only dev identity, safe config, profile/logo/mixtape persistence.');
