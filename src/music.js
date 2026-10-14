// Real recordings use a single native audio element; scenery and music have separate clocks.
const musicAudio=$('#music-audio');
const starterTracks=JSON.parse($('#starter-catalog').textContent);
const starterTape={id:'atelier-vol-1',title:'Atelier · Vol. 01',color:'#dbaa64',tracks:starterTracks,builtin:true};
let uploadedTracks=[],savedCassettes=[],loadedTape=starterTape,musicQueue=[...starterTracks],musicIndex=0,musicRevision=0,musicFrame=0,musicPaint=0,libraryReady=false,libraryFetching=false;
let draftIds=[],draftId=crypto.randomUUID(),draftPublishing=false,uploadBusy=false,musicTab='songs',musicRepeat=false;
const MAX_AUDIO_BYTES=50*1024*1024,pendingUploads=new Map();
const songById=id=>[...starterTracks,...uploadedTracks,...unlockedSecretTracks(),...savedCassettes.flatMap(t=>t.tracks)].find(t=>t.id===id);
const currentSong=()=>musicQueue[musicIndex]||null;
const musicTime=n=>{const s=Number.isFinite(n)&&n>0?Math.floor(n):0;return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
function musicButton(text,action,className='small-button'){const b=node('button',className,text);b.type='button';b.addEventListener('click',action);return b}
function setMusicStatus(message,error=false){const el=$('#music-status');el.textContent=message;el.classList.toggle('music-error',error)}
function profileRequestHeaders(headers={}){return {...headers,...(profileSession?{'x-atelier-session':profileSession}:{}),...(playerProfile?{'x-atelier-profile':playerProfile.id}:{})}}
async function musicApi(path,options){if(location.protocol==='file:')throw new Error('Open the live app to save uploads and cassettes. Starter songs still play in this copy.');const response=await fetch(path,{credentials:'same-origin',...options,headers:profileRequestHeaders(options?.headers)});let data;try{data=await response.json()}catch{throw new Error('Your library could not be reached. Please try again.')}if(!response.ok)throw new Error(data.error||'This music action could not be completed.');return data}
function drawTapeCard(canvas,tape,t=0){const c=canvas.getContext('2d');c.clearRect(0,0,540,330);c.fillStyle='#1c3435';c.fillRect(0,0,540,330);cassette(c,{...defaults,secondary:'#304b4b',tapeColor:tape.color,outline:3},18,16,504,294,t,tape.title.slice(0,18));}
const cassetteCards=new Map(),cassetteArtCache=new Map();
function cassetteArtwork(tape){const key=JSON.stringify([tape.title,tape.color]);let src=cassetteArtCache.get(key);if(!src){const buffer=document.createElement('canvas');buffer.width=540;buffer.height=330;try{drawTapeCard(buffer,tape);src=buffer.toDataURL('image/png');cassetteArtCache.set(key,src);if(cassetteArtCache.size>24)cassetteArtCache.delete(cassetteArtCache.keys().next().value)}catch{src=null}finally{buffer.width=0;buffer.height=0}}const img=node('img','');if(src)img.src=src;img.alt=tape.title+' cassette';img.setAttribute('width','540');img.setAttribute('height','330');img.decoding='async';img.loading='lazy';return img}
function draftRecoveryKey(){return 'atelier-mixtape-recovery-v1:'+ (playerProfile?.id||'guest')}
function persistMixtapeDraft(status='editing'){try{const key=draftRecoveryKey();if(!draftIds.length){globalThis.localStorage.removeItem(key);return}globalThis.localStorage.setItem(key,JSON.stringify({id:draftId,title:$('#mixtape-name').value,color:$('#mixtape-color').value,tracks:[...draftIds],status}))}catch{}}
function clearDraftRecovery(){try{globalThis.localStorage.removeItem(draftRecoveryKey())}catch{}}
function restoreMixtapeDraft(){try{const text=globalThis.localStorage.getItem(draftRecoveryKey());if(!text)return false;const data=JSON.parse(text);if(typeof data.id!=='string'||!/^[a-f0-9-]{36}$/i.test(data.id)||!Array.isArray(data.tracks)||!data.tracks.length||data.tracks.length>50||data.tracks.some(id=>typeof id!=='string'||id.length>80)||typeof data.title!=='string'||data.title.length>48||!/^#[a-f0-9]{6}$/i.test(data.color))return false;if(savedCassettes.some(t=>t.id===data.id)){clearDraftRecovery();setMusicStatus('Your last cassette was saved successfully. It is in your cassette library.');return false}draftId=data.id;draftIds=[...data.tracks];$('#mixtape-name').value=data.title;$('#mixtape-color').value=data.color;renderDraft();selectMusicTab('mixtape');setMusicStatus('Restored your unfinished mixtape on this device. You can keep editing or publish it.');return true}catch{return false}}
function renderCassetteLibrary(){
 const shelf=$('#cassette-shelf');const ids=new Set([starterTape,...savedCassettes].map(t=>t.id));for(const [id,card] of cassetteCards)if(!ids.has(id)){card.remove();cassetteCards.delete(id)}
 for(const tape of [starterTape,...savedCassettes]){
  let card=cassetteCards.get(tape.id);if(card){card.classList.toggle('is-loaded',loadedTape?.id===tape.id);card.querySelector('.primary').textContent=loadedTape?.id===tape.id?'Loaded · play':'Load & play';shelf.append(card);continue}card=node('article','cassette-card');cassetteCards.set(tape.id,card);card.classList.toggle('is-loaded',loadedTape?.id===tape.id);
  const art=cassetteArtwork(tape);art.setAttribute('aria-hidden','true');
  const copy=node('div','cassette-copy');copy.append(node('h3','',tape.title),node('p','',tape.tracks.length+' songs · '+musicTime(tape.tracks.reduce((n,t)=>n+t.duration,0))+(tape.builtin?' · Original starter tape':'')));
  const load=musicButton(loadedTape?.id===tape.id?'Loaded · play':'Load & play',()=>loadCassette(tape,true),'primary');
  const edit=musicButton('Copy to mixtape',()=>{if(draftPublishing)return;if(draftIds.length&&!confirm('Replace your current mixtape draft with this cassette?'))return;draftIds=tape.tracks.map(t=>t.id);draftId=crypto.randomUUID();$('#mixtape-name').value=tape.title.slice(0,48);$('#mixtape-color').value=tape.color;persistMixtapeDraft();renderDraft();selectMusicTab('mixtape',true)});
  const actions=node('div','cassette-actions');actions.append(load,edit);copy.append(actions);card.append(art,copy);shelf.append(card);
 }
 const select=$('#radio-tape'),previous=loadedTape?.id||'atelier-vol-1';select.replaceChildren();for(const tape of [starterTape,...savedCassettes]){const option=node('option','',tape.title);option.value=tape.id;select.append(option)}select.value=previous;

}
function renderMusicLibrary(){
 const list=$('#song-list');list.replaceChildren();
 for(const [index,song]of [...starterTracks,...uploadedTracks,...unlockedSecretTracks()].entries()){
  const row=node('article','song-row');row.dataset.songId=song.id;row.classList.toggle('is-current',song.id===currentSong()?.id);
  const number=node('span','song-number',String(index+1).padStart(2,'0'));
  const info=node('div','song-info');info.append(node('strong','',song.title),node('small','',song.source!=='upload'?song.description||song.artist:'Your upload · '+song.filename));
  const time=node('span','song-duration',musicTime(song.duration));
  const play=musicButton('Play',()=>playSong(song));play.setAttribute('aria-label','Play '+song.title);
  const add=musicButton('+ Mixtape',()=>addDraftSong(song.id));add.setAttribute('aria-label','Add '+song.title+' to mixtape');
  row.append(number,info,time,play,add);list.append(row);
 }
 renderCassetteLibrary();renderQueue();renderDraft();syncMusicPlayer();
}
function renderQueue(){const list=$('#music-queue');list.replaceChildren();musicQueue.forEach((song,index)=>{const b=musicButton(String(index+1).padStart(2,'0')+'  '+song.title+'  ·  '+musicTime(song.duration),()=>{selectSong(index);void playMusic()},'queue-song');b.setAttribute('aria-current',index===musicIndex?'true':'false');list.append(b)})}
function renderDraft({preview=true}={}){
 $('#mixtape-count').textContent=String(draftIds.length);
 const list=$('#mixtape-tracks');list.replaceChildren();
 draftIds.forEach((id,index)=>{const song=songById(id);const row=node('li','draft-song'),label=node('span','song-info',String(index+1).padStart(2,'0')+'  '+(song?.title||'Unavailable song'));row.append(label);
  const up=musicButton('↑',()=>moveDraftSong(index,-1));up.disabled=index===0;up.setAttribute('aria-label','Move '+(song?.title||'song')+' earlier');
  const down=musicButton('↓',()=>moveDraftSong(index,1));down.disabled=index===draftIds.length-1;down.setAttribute('aria-label','Move '+(song?.title||'song')+' later');
  const remove=musicButton('Remove',()=>{if(draftPublishing)return;draftIds.splice(index,1);draftId=crypto.randomUUID();persistMixtapeDraft();renderDraft()});remove.setAttribute('aria-label','Remove '+(song?.title||'song')+' from mixtape');row.append(up,down,remove);list.append(row)
 });
 $('#mixtape-empty').hidden=!!draftIds.length;
 $('#mixtape-summary').textContent=draftIds.length+' / 50 songs · '+musicTime(draftIds.reduce((n,id)=>n+(songById(id)?.duration||0),0));
 if(preview){const title=$('#mixtape-name').value.trim()||'YOUR MIXTAPE';drawTapeCard($('#mixtape-preview'),{title,color:$('#mixtape-color').value})}
 $('#publish-mixtape').disabled=draftPublishing||!draftIds.length;$('#publish-mixtape').textContent=draftPublishing?'Publishing…':'Publish cassette';
}
function addDraftSong(id){if(draftPublishing)return;if(draftIds.length>=50){toast('A mixtape holds up to 50 songs.');return}draftIds.push(id);draftId=crypto.randomUUID();persistMixtapeDraft();renderDraft();toast('Added to your mixtape.');$('#mixtape-count').textContent=String(draftIds.length)}
function moveDraftSong(index,delta){if(draftPublishing)return;const next=index+delta;if(next<0||next>=draftIds.length)return;[draftIds[index],draftIds[next]]=[draftIds[next],draftIds[index]];draftId=crypto.randomUUID();persistMixtapeDraft();renderDraft()}
function selectMusicTab(id,focus=false){musicTab=id;$$('[data-music-tab]').forEach(b=>{const active=b.dataset.musicTab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('#music-panel-'+b.dataset.musicTab).hidden=!active;if(active&&focus)b.focus({preventScroll:true})})}
async function refreshMusicLibrary(){if(libraryFetching)return;libraryFetching=true;$('#refresh-library').disabled=true;setMusicStatus('Opening your saved library…');try{const data=await musicApi('/api/library');if(data.profileId!==undefined&&data.profileId!==(playerProfile?.id||null))throw Error('Reconnect your telephone profile to open its collection.');$('#recover-tapes').hidden=!playerProfile||!data.unassignedCassettes;uploadedTracks=[...new Map([...uploadedTracks,...data.tracks].map(t=>[t.id,t])).values()];savedCassettes=[...new Map([...savedCassettes,...data.cassettes].map(t=>[t.id,t])).values()];libraryReady=true;renderMusicLibrary();setMusicStatus('Saved library ready · '+uploadedTracks.length+' uploads · '+savedCassettes.length+' published cassettes.')}catch(e){setMusicStatus(e.message,true)}finally{libraryFetching=false;$('#refresh-library').disabled=false}}
async function publishMixtape(){
 if(draftPublishing||!draftIds.length)return;
 if(profileBooting||profileBusy||libraryFetching||uploadBusy){toast('Wait for your library to finish loading or saving, then publish.');return}
 const title=$('#mixtape-name').value.trim();if(!title){$('#mixtape-name').focus();toast('Give your mixtape a name.');return}
 const payload={id:draftId,title,color:$('#mixtape-color').value,tracks:[...draftIds]};persistMixtapeDraft('publishing');draftPublishing=true;
 const button=$('#publish-mixtape'),editor=$('#mixtape-editor');button.disabled=true;button.textContent='Publishing…';editor.disabled=true;
 let saved=false;
 try{
  // Dispatch the save before any canvas redraw or library reconstruction.
  const {cassette}=await musicApi('/api/cassettes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(cassette?.id!==payload.id||!Array.isArray(cassette.tracks))throw new Error('The save could not be confirmed. Your draft is safe; try publishing again.');
  if(!savedCassettes.some(t=>t.id===cassette.id))savedCassettes.unshift(cassette);libraryReady=true;saved=true;
  clearDraftRecovery();draftIds=[];draftId=crypto.randomUUID();
  setMusicStatus('“'+cassette.title+'” is saved in your cassette library.');toast('Cassette saved. Load it from your library.');
  try{renderCassetteLibrary();selectMusicTab('cassettes',true)}catch{setMusicStatus('Your cassette is saved. Tap Refresh library to display it.')}
 }catch(e){persistMixtapeDraft();setMusicStatus(e.message,true);toast(e.message)}
 finally{draftPublishing=false;editor.disabled=false;button.disabled=!draftIds.length;button.textContent='Publish cassette';try{renderDraft({preview:false})}catch{if(!saved)setMusicStatus('Your draft is safe. Try publishing again.',true)}}
}
function readAudioMetadata(file){return new Promise((resolve,reject)=>{const probe=document.createElement('audio'),url=URL.createObjectURL(file);let settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);probe.removeAttribute('src');probe.load();URL.revokeObjectURL(url);error?reject(error):resolve(value)};const timer=setTimeout(()=>finish(new Error('This file could not be read. Try another MP3 or WAV.')),20000);probe.preload='metadata';probe.addEventListener('loadedmetadata',()=>{const d=probe.duration;finish(!Number.isFinite(d)||d<=0?new Error('This recording has no readable duration.'):null,d)},{once:true});probe.addEventListener('error',()=>finish(new Error('This browser could not read that audio. Try an MP3 or standard PCM WAV.')),{once:true});probe.src=url;probe.load()})}
async function importMusicFiles(files){if(uploadBusy||!files.length)return;uploadBusy=true;$('#import-audio').disabled=true;let success=0,failed=0;
 for(const file of files){try{if(!/\.(mp3|wav)$/i.test(file.name)||!file.size)throw new Error(file.name+': choose an MP3 or WAV file.');if(file.size>MAX_AUDIO_BYTES)throw new Error(file.name+': exceeds the 50 MB limit.');setMusicStatus('Reading '+file.name+'…');const duration=await readAudioMetadata(file);const key=file.name+'|'+file.size+'|'+file.lastModified,id=pendingUploads.get(key)||crypto.randomUUID();pendingUploads.set(key,id);const title=file.name.replace(/\.(mp3|wav)$/i,'').slice(0,120)||'Untitled recording',form=new FormData();form.append('audio',file);form.append('id',id);form.append('title',title);form.append('duration',String(duration));setMusicStatus('Saving '+file.name+'…');const {track}=await musicApi('/api/tracks',{method:'POST',body:form});if(!uploadedTracks.some(t=>t.id===track.id))uploadedTracks.unshift(track);pendingUploads.delete(key);libraryReady=true;success++;renderMusicLibrary()}
 catch(e){failed++;setMusicStatus(e.message,true);toast(e.message)}
 }
 uploadBusy=false;$('#import-audio').disabled=false;$('#audio-files').value='';if(!failed)setMusicStatus(success+' song'+(success===1?'':'s')+' saved to your library. Add them to a mixtape anytime.');else setMusicStatus(success+' saved · '+failed+' could not be imported. Choose the failed files again to retry.',true)
}
let uploadPlaybackUrl=null,uploadPlaybackPromise=null;
function releaseUploadedPlayback(){if(uploadPlaybackUrl)URL.revokeObjectURL(uploadPlaybackUrl);uploadPlaybackUrl=null;uploadPlaybackPromise=null}
async function prepareUploadedPlayback(){if(uploadPlaybackUrl)return uploadPlaybackUrl;if(uploadPlaybackPromise)return uploadPlaybackPromise;const song=currentSong(),revision=musicRevision;uploadPlaybackPromise=(async()=>{const r=await fetch(song.url,{credentials:'same-origin',headers:profileRequestHeaders()});if(!r.ok)throw Error('Reconnect your profile to play this upload.');const blob=song.codec==='atelier-adpcm'?new Blob([tapeCodec.decodeTape(new Uint8Array(await r.arrayBuffer()))],{type:'audio/wav'}):await r.blob();if(revision!==musicRevision)return null;uploadPlaybackUrl=URL.createObjectURL(blob);return uploadPlaybackUrl})().catch(e=>{if(revision===musicRevision)uploadPlaybackPromise=null;throw e});return uploadPlaybackPromise}
function selectSong(index){if(typeof radioListening!=='undefined'&&radioListening&&!radioSyncing)leaveRadioListening(false);if(!musicQueue[index])return;musicRevision++;musicAudio.pause();releaseUploadedPlayback();musicIndex=index;if((musicQueue[index].codec==='atelier-adpcm'||musicQueue[index].source==='upload'&&profileSession))musicAudio.removeAttribute('src');else musicAudio.src=musicQueue[index].url;musicAudio.load();renderQueue();syncMusicPlayer();syncMediaSession()}
function playSong(song){loadedTape=null;musicQueue=[song];selectSong(0);renderMusicLibrary();void playMusic()}
function loadCassette(tape,autoplay=false){if(typeof radioListening!=='undefined'&&radioListening)leaveRadioListening(false);if(!tape?.tracks?.length)return;if(hardwareReady){hardwareLive.empty=false;if(!$('#hardware-shelf').hidden)closeHardwareShelf();hardwareLive.door=-1;}loadedTape=tape;musicQueue=[...tape.tracks];selectSong(0);if(!activeSecret)applyPatch({tapeLabel:tape.title.slice(0,18),tapeColor:tape.color});renderMusicLibrary();if(autoplay)void playMusic();toast('Loaded '+tape.title+'.')}
async function playMusic(){if(!state.logoPicked){openOtoLogoPicker(()=>void playMusic());return}if(!currentSong())return;const revision=musicRevision;if(hardwareReady){hardwareLive.power=true;hardwareLive.switches[7]=false;hardwareLive.powerResume=false;hardwareLive.empty=false;if(!$('#hardware-shelf').hidden)closeHardwareShelf();hardwareLive.door=-1;}stopAudio();try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}const ready=resumeHardwareSound();applyHardwareSound();try{await ready;if(revision!==musicRevision)return;if(!musicAudio.getAttribute('src')){const url=(currentSong().codec==='atelier-adpcm'||currentSong().source==='upload'&&profileSession)?await prepareUploadedPlayback():currentSong().url;if(revision!==musicRevision||!url)return;musicAudio.src=url;musicAudio.load()}if(musicAudio.ended)musicAudio.currentTime=0;await musicAudio.play();if(revision!==musicRevision)return;setMusicStatus('Playing '+currentSong().title+'.')}catch(e){if(revision!==musicRevision||e.name==='AbortError')return;setMusicStatus('Playback could not start. Tap Play again, or choose a different audio file.',true);syncMusicPlayer()}}
function toggleMusic(){if(musicAudio.paused)void playMusic();else musicAudio.pause()}
function nextMusic(auto=false){if(typeof radioListening!=='undefined'&&radioListening){radioNextPoll=0;if(auto)return;leaveRadioListening();return}if(musicIndex+1<musicQueue.length){selectSong(musicIndex+1);void playMusic()}else if(musicRepeat){selectSong(0);void playMusic()}else if(!auto&&musicQueue.length){selectSong(0);void playMusic()}else{musicAudio.pause();syncMusicPlayer();setMusicStatus('End of tape · press Play to listen again.')}}
function previousMusic(){if(typeof radioListening!=='undefined'&&radioListening){leaveRadioListening();return}if(musicAudio.currentTime>3){musicAudio.currentTime=0;syncMusicProgress();return}selectSong(Math.max(0,musicIndex-1));void playMusic()}
function seekMusic(value){if(Number.isFinite(musicAudio.duration)&&musicAudio.duration>0){musicAudio.currentTime=Math.min(musicAudio.duration,Math.max(0,Number(value)/1000*musicAudio.duration));syncMusicProgress()}}
function syncMusicProgress(){const d=Number.isFinite(musicAudio.duration)?musicAudio.duration:currentSong()?.duration||0,t=musicAudio.currentTime||0;for(const prefix of ['music','radio-music']){const range=$('#'+prefix+'-seek');if(document.activeElement!==range)range.value=String(d?Math.round(t/d*1000):0);range.disabled=!Number.isFinite(musicAudio.duration)||musicAudio.duration<=0;range.setAttribute('aria-valuetext',musicTime(t)+' of '+musicTime(d));$('#'+prefix+'-time').textContent=musicTime(t)+' / '+musicTime(d)}if(navigator.mediaSession?.setPositionState&&Number.isFinite(musicAudio.duration)&&musicAudio.duration>0)try{navigator.mediaSession.setPositionState({duration:musicAudio.duration,playbackRate:musicAudio.playbackRate||1,position:Math.min(musicAudio.duration,Math.max(0,t))})}catch{}}
function syncMusicPlayer(){const song=currentSong();$$('[data-song-id]').forEach(row=>row.classList.toggle('is-current',row.dataset.songId===song?.id));for(const id of ['music-title','radio-music-title'])$('#'+id).textContent=song?.title||'Load a cassette';$('#music-artist').textContent=song?.artist||'Your private cassette deck';$('#music-tape-name').textContent=loadedTape?.title||'Single song';$('#radio-music-title').title=(loadedTape?.title||'Single song')+' · '+(song?.title||'');for(const id of ['music-play','radio-music-play']){const b=$('#'+id);b.textContent=musicAudio.paused?'▶ Play':'Ⅱ Pause';b.setAttribute('aria-pressed',String(!musicAudio.paused));b.setAttribute('aria-label',(musicAudio.paused?'Play ':'Pause ')+(song?.title||'music'))}$('#radio-tape').value=loadedTape?.id||'';syncMusicProgress();if(navigator.mediaSession)navigator.mediaSession.playbackState=musicAudio.paused?'paused':'playing'}
function animateMusic(ts){if(!musicPlaying||document.hidden){musicFrame=0;return}if(ts-musicPaint>40){if(!playing&&!(displayActive&&displayMode==='atmosphere'&&atmosphereRunning))draw(musicAudio.currentTime);musicPaint=ts}musicFrame=requestAnimationFrame(animateMusic)}
function syncMediaSession(){if(!navigator.mediaSession)return;const song=currentSong();if(window.MediaMetadata&&song)navigator.mediaSession.metadata=new MediaMetadata({title:song.title,artist:song.artist||'Your upload',album:loadedTape?.title||'oto · 音'});}
musicAudio.volume=.65;
for(const id of ['music-play','radio-music-play'])$('#'+id).addEventListener('click',toggleMusic);
for(const id of ['music-next','radio-music-next'])$('#'+id).addEventListener('click',()=>nextMusic());
for(const id of ['music-prev','radio-music-prev'])$('#'+id).addEventListener('click',previousMusic);
for(const id of ['music-seek','radio-music-seek'])$('#'+id).addEventListener('input',e=>seekMusic(e.target.value));
for(const id of ['music-volume','radio-music-volume'])$('#'+id).addEventListener('input',e=>{setHardwareValue({kind:'knob',key:'volume',label:'Volume'},Number(e.target.value))});
$('#music-repeat').addEventListener('click',()=>{musicRepeat=!musicRepeat;hardwareLive.switches[0]=musicRepeat;$('#music-repeat').setAttribute('aria-pressed',String(musicRepeat));$('#music-repeat').textContent=musicRepeat?'Repeat tape: on':'Repeat tape: off'});
musicAudio.addEventListener('play',()=>{musicPlaying=true;stopAudio();syncMusicPlayer();renderQueue();if(!musicFrame&&!document.hidden)musicFrame=requestAnimationFrame(animateMusic)});
musicAudio.addEventListener('pause',()=>{musicPlaying=false;cancelAnimationFrame(musicFrame);musicFrame=0;syncMusicPlayer();draw();syncAudio()});
musicAudio.addEventListener('ended',()=>nextMusic(true));
for(const event of ['timeupdate','loadedmetadata','durationchange'])musicAudio.addEventListener(event,syncMusicProgress);
musicAudio.addEventListener('error',()=>{setMusicStatus('This song could not be loaded. Try again or choose another recording.',true);syncMusicPlayer()});
$('#radio-tape').addEventListener('change',e=>{loadCassette([starterTape,...savedCassettes].find(t=>t.id===e.target.value),true);revealRadioControls()});
$('#import-audio').addEventListener('click',()=>$('#audio-files').click());$('#audio-files').addEventListener('change',e=>void importMusicFiles(Array.from(e.target.files||[])));
$('#recover-tapes').addEventListener('click',async()=>{if(!profileCanSwitch()||!playerProfile)return;profileBusy=true;$('#recover-tapes').disabled=true;try{await musicApi('/api/profile/recover',{method:'POST',body:'{}'});await refreshMusicLibrary();setMusicStatus('Earlier guest tapes and uploads are now linked to '+playerProfile.name+'.')}catch(e){setMusicStatus(e.message,true)}finally{profileBusy=false;$('#recover-tapes').disabled=false}});
$('#refresh-library').addEventListener('click',refreshMusicLibrary);$('#publish-mixtape').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void publishMixtape()});
for(const id of ['mixtape-name','mixtape-color'])$('#'+id).addEventListener('input',()=>{draftId=crypto.randomUUID();persistMixtapeDraft();renderDraft()});
$$('[data-music-tab]').forEach(b=>b.addEventListener('click',()=>selectMusicTab(b.dataset.musicTab)));
$('#music-tabs').addEventListener('keydown',e=>{const tabs=$$('[data-music-tab]'),i=tabs.indexOf(document.activeElement);if(i<0)return;let n=i;if(e.key==='ArrowRight')n=(i+1)%tabs.length;else if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;e.preventDefault();selectMusicTab(tabs[n].dataset.musicTab,true)});
for(const id of ['open-music','open-music-stage'])$('#'+id).addEventListener('click',()=>{$('#music-room').scrollIntoView({behavior:atmosphereReducedMotion?.matches?'auto':'smooth',block:'start'});$('#music-play').focus({preventScroll:true})});
$('#music-drop').addEventListener('dragover',e=>{e.preventDefault();$('#music-drop').classList.add('is-dragging')});$('#music-drop').addEventListener('dragleave',()=>$('#music-drop').classList.remove('is-dragging'));$('#music-drop').addEventListener('drop',e=>{e.preventDefault();$('#music-drop').classList.remove('is-dragging');void importMusicFiles(Array.from(e.dataTransfer?.files||[]))});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(musicFrame);musicFrame=0}else if(musicPlaying&&!musicFrame)musicFrame=requestAnimationFrame(animateMusic)});
if(navigator.mediaSession){for(const [action,fn]of Object.entries({play:playMusic,pause:()=>musicAudio.pause(),previoustrack:previousMusic,nexttrack:()=>nextMusic(),seekto:e=>{if(Number.isFinite(musicAudio.duration))musicAudio.currentTime=Math.min(musicAudio.duration,Math.max(0,e.seekTime||0))},seekbackward:e=>{musicAudio.currentTime=Math.max(0,musicAudio.currentTime-(e.seekOffset||10))},seekforward:e=>{if(Number.isFinite(musicAudio.duration))musicAudio.currentTime=Math.min(musicAudio.duration,musicAudio.currentTime+(e.seekOffset||10))}}))try{navigator.mediaSession.setActionHandler(action,fn)}catch{}}
renderMusicLibrary();


window.addEventListener('pagehide',()=>{if(draftIds.length)persistMixtapeDraft(draftPublishing?'publishing':'editing')});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&draftIds.length)persistMixtapeDraft(draftPublishing?'publishing':'editing')});
