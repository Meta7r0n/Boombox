// Persistent oto player.
window.OTO_EMBEDDED = new URLSearchParams(location.search).get('embed') === '1';
const otoEmbedded = new URLSearchParams(location.search).get('embed') === '1';
const otoParents = window.OTO_CONFIG?.parentOrigins || [location.origin];
let otoPopup = null;
let otoParentOrigin = null, otoView = otoEmbedded ? 'dock' : 'expanded', otoHandoff = null;
const otoInstance = crypto.randomUUID();
let otoChannel = null;
try { otoChannel = new BroadcastChannel('oto-playback-v1'); } catch {}
function otoPost(type, detail = {}) {
  if (otoEmbedded && otoParentOrigin) window.parent.postMessage({channel:'oto-v1',type,...detail}, otoParentOrigin);
}
function otoSetView(view) {
  otoView = view === 'dock' ? 'dock' : 'expanded';
  document.documentElement.dataset.otoView = otoView;
  if (otoView === 'dock' && displayActive) void exitRadioDisplay();
  otoPost('view', {view:otoView});
}
function otoUpdateDock() {
  const song = currentSong(), live = typeof radioListening !== 'undefined' && radioListening;
  $('#oto-title').textContent = song?.title || 'Choose a cassette';
  $('#oto-subtitle').textContent = live ? radioLabel(live.station) : loadedTape?.title || 'oto · 音';
  $('#oto-play').textContent = musicAudio.paused ? '▶' : 'Ⅱ';
  $('#oto-play').setAttribute('aria-label', musicAudio.paused ? 'Play music' : 'Pause music');
  $('#oto-volume').value = String(Math.round(musicAudio.volume * 100));
  $('#oto-mark').textContent = state.logo;
  if(navigator.mediaSession)navigator.mediaSession.playbackState=musicAudio.paused?'paused':'playing';
  $('#oto-progress').value = Number.isFinite(musicAudio.duration) ? musicAudio.currentTime / musicAudio.duration : 0;
  otoPost('status', {playing:!musicAudio.paused, title:song?.title || '', live:!!live});
}
function otoTogglePlayback() {
  if (radioListening) { radioLocalPaused = !musicAudio.paused; void syncRadioProgram(); }
  else if (musicAudio.paused) void playMusic(); else musicAudio.pause();
}
function otoPauseLocal() {
  if (radioListening) radioLocalPaused = true;
  musicAudio.pause();
}
otoChannel?.addEventListener('message', event => {
  if (event.data?.type === 'claim' && event.data.id !== otoInstance) otoPauseLocal();
});
musicAudio.addEventListener('play', () => {otoChannel?.postMessage({type:'claim',id:otoInstance});try{window.opener?.postMessage({channel:'oto-v1',type:'popout-playing'},location.origin)}catch{}});
for (const type of ['play','pause','timeupdate','loadedmetadata','volumechange','ended']) musicAudio.addEventListener(type, otoUpdateDock);
$('#oto-play').addEventListener('click', otoTogglePlayback);
$('#oto-prev').addEventListener('click', () => { if (!radioListening) previousMusic(); });
$('#oto-next').addEventListener('click', () => { if (!radioListening) nextMusic(); });
$('#oto-volume').addEventListener('input', event => {musicAudio.volume = Number(event.target.value) / 100;});
$('#oto-mark').addEventListener('click', () => {otoSetView('expanded');openOtoLogoPicker();});
$('#oto-expand').addEventListener('click', () => {otoSetView(otoView === 'dock' ? 'expanded' : 'dock');});
$('#oto-tapes').addEventListener('click', () => {otoSetView('expanded');introClose();$('#open-music').click();});
$('#oto-radio').addEventListener('click', () => {otoSetView('expanded');introClose();$('#radio-open').click();});
$('#oto-scene').addEventListener('click', () => {otoSetView('expanded');introClose();void enterRadioDisplay('atmosphere');});
$('#oto-dock-side').addEventListener('click', () => {
  const side = document.documentElement.dataset.otoDock === 'top' ? 'bottom' : 'top';
  document.documentElement.dataset.otoDock = side; otoPost('dock', {side});
});
window.addEventListener('message', event => {
  if(event.origin===location.origin&&event.source===otoPopup&&event.data?.channel==='oto-v1'&&event.data.type==='popout-playing'){otoPauseLocal();return;}
  if (!otoEmbedded || !otoValidHostMessage(event, window.parent, otoParents)) return;
  otoParentOrigin = event.origin;
  if (event.data.command === 'view') otoSetView(event.data.view);
  if (event.data.command === 'dock') document.documentElement.dataset.otoDock = event.data.side === 'top' ? 'top' : 'bottom';
  otoUpdateDock();
});
function otoPopout() {
  if (radioHostSession) {toast('Keep the host panel open during your timed broadcast. Listeners can use the pop-out player.');return;}
  const payload = otoCleanHandoff({version:1,tapeId:loadedTape?.id || starterTape.id,index:musicIndex,seconds:musicAudio.currentTime || 0,logo:state.logo,radioId:radioListening?.id || null});
  try { sessionStorage.setItem('oto-popout',JSON.stringify(payload)); } catch {}
  const popup = window.open('/app/?popout=1', 'oto-player-'+crypto.randomUUID(), 'popup,width=1000,height=760');
  otoPopup = popup;
  if (!popup) toast('Allow pop-ups to open the player, then try again.');
  // Keep this audio playing until the other player successfully starts and claims it.
}
$('#oto-popout').addEventListener('click', otoPopout);
$('#oto-signin').hidden=!window.OTO_CONFIG;
$('#oto-signin').addEventListener('click',()=>window.open('/auth/login','_blank','noopener'));
async function otoResumeHandoff() {
  if (!otoHandoff) return;
  const handoff = otoHandoff;
  if (profileBooting) {toast('Your collection is still connecting. Try Continue listening again.');return;}
  applyPatch({logo:handoff.logo,logoPicked:true});
  if (handoff.radioId) {
    await tuneRadioStation(handoff.radioId);
  } else {
    const tape = [starterTape,...savedCassettes].find(t => t.id === handoff.tapeId);
    if (!tape) {toast('Reconnect your profile to load this cassette, then press Continue listening.');return;}
    loadCassette(tape); selectSong(Math.min(handoff.index,musicQueue.length-1));
    await playMusic();
    if (Number.isFinite(musicAudio.duration)) musicAudio.currentTime = Math.min(handoff.seconds,Math.max(0,musicAudio.duration-.05));
  }
  if (!musicAudio.paused) {otoHandoff=null;$('#oto-continue').hidden=true;}
}
$('#oto-continue').addEventListener('click', () => void otoResumeHandoff());
if (new URLSearchParams(location.search).get('popout') === '1') {
  try { otoHandoff = otoCleanHandoff(JSON.parse(sessionStorage.getItem('oto-popout')));sessionStorage.removeItem('oto-popout'); } catch {}
  $('#oto-continue').hidden = !otoHandoff;
}
if (otoEmbedded) {
  document.documentElement.classList.add('oto-embedded');
  $('#oto-dock').hidden = false;
  const referOrigin = (() => {try{return new URL(document.referrer).origin;}catch{return null;}})();
  if (otoParents.includes(referOrigin)) otoParentOrigin = referOrigin;
} else $('#oto-dock').hidden = false;
if (navigator.mediaSession) {
  for (const [action,handler] of [['play',()=>{if(radioListening){radioLocalPaused=false;void syncRadioProgram();}else void playMusic();}],['pause',otoPauseLocal],['nexttrack',()=>{if(!radioListening)nextMusic();}],['previoustrack',()=>{if(!radioListening)previousMusic();}]]) try {navigator.mediaSession.setActionHandler(action,handler);} catch {}
}
otoSetView(otoView); otoUpdateDock();
// End persistent oto player.
