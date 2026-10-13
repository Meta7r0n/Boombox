// Fullscreen scene navigation shares the existing display and native fullscreen session.
let viewTransition=null,viewTransitionFrame=0,atmosphereVisited=false,boomboxHitKey='';
const VIEW_ZOOM_MS=780;
function atmosphereFrontRect(s,width,height,time=atmosphereTime){if(activeSecret)return secretFrontRect(width,height,time);
 const layout=atmosphereLayout(s,width,height,atmospherePhase(time)),bounds=atmosphereObjectBounds(s),g=geometry(s),scale=layout.box.w/bounds.w*layout.scale;
 return{x:layout.ox+layout.box.x*layout.scale+(g.x-bounds.x)*scale,y:layout.oy+layout.box.y*layout.scale+(g.y-bounds.y)*scale,w:g.w*scale,h:g.h*scale};
}
function syncBoomboxHitTarget(){
 const hit=$('#atmosphere-boombox');hit.hidden=!displayActive||!displayLandscape||displayMode!=='atmosphere'||!!viewTransition;
 if(hit.hidden)return;
 const r=atmosphereFrontRect(state,radioCanvas.width,radioCanvas.height),bounds=$('#radio-screen').getBoundingClientRect(),sx=bounds.width/radioCanvas.width,sy=bounds.height/radioCanvas.height;
 const values=[r.x*sx,r.y*sy,r.w*sx,r.h*sy].map(v=>Math.round(v*10)/10),key=values.join('|');
 if(key!==boomboxHitKey){for(const [i,property]of ['left','top','width','height'].entries())hit.style[property]=values[i]+'px';boomboxHitKey=key}
}
function syncDisplayNavigation(){
 const button=$('#radio-view-switch'),atmosphere=displayMode==='atmosphere';$('#radio-panel-view').hidden=!displayLandscape||atmosphere;$('#radio-panel-view').disabled=!!viewTransition;$('#radio-play').hidden=!displayLandscape||atmosphere;$('#atmosphere-scene-label').hidden=!displayLandscape||!atmosphere||!!activeSecret;$('#atmosphere-toggle').hidden=!displayLandscape||!atmosphere;button.hidden=!displayLandscape;button.disabled=!!viewTransition;
 $('#radio-view-switch span').textContent=atmosphere?'Zoom in':'Scene';button.setAttribute('aria-label',atmosphere?'Zoom into boombox':'Zoom out to atmosphere scene');button.title=atmosphere?'Zoom into boombox':'Zoom out to atmosphere scene';
 $('#radio-navigation-hint').hidden=!displayLandscape||!!viewTransition;$('#radio-navigation-hint').textContent=atmosphere?'Tap the boombox to zoom in':activeSecret?'Drag the knobs · Eject swaps tapes · Scene zooms out':'Drag knobs and antenna · tap Eject to swap tapes';
 for(const id of ['atmosphere-scene','atmosphere-toggle','radio-play'])$('#'+id).disabled=!!viewTransition;
 syncBoomboxHitTarget();if(hardwareReady)syncHardwareTargets();syncSecretControls();
}
function radioTabStops(){
 if(!$('#hardware-shelf').hidden)return Array.from($('#hardware-shelf').querySelectorAll('button')).filter(b=>!b.disabled);
 const list=displayLandscape?(displayMode==='boombox'?activeSecret?[...secretControlNodes.values(),$('#radio-view-switch'),$('#radio-panel-view'),$('#radio-open-display'),$('#handbook-open-display'),$('#phone-open-display'),$('#exit-display')]:[...hardwareParts(state).map(p=>hardwareNodes.get('radio:'+p.id)),$('#radio-view-switch'),$('#radio-panel-view'),$('#radio-open-display'),$('#handbook-open-display'),$('#phone-open-display'),$('#exit-display')]:[$('#atmosphere-boombox'),$('#radio-view-switch'),$('#atmosphere-scene'),$('#atmosphere-toggle'),$('#radio-open-display'),$('#handbook-open-display'),$('#phone-open-display'),$('#exit-display'),$('#radio-music-prev'),$('#radio-music-play'),$('#radio-music-next'),$('#radio-tape'),$('#radio-music-seek'),...(window.innerHeight>420?[$('#radio-music-volume')]:[])]):[$('#exit-display')];
 return [$('#radio-checkin-alert'),...list].filter(b=>b&&!b.hidden&&!b.disabled);
}

function cancelDisplayTransition(){if(viewTransition)for(const key of ['scene','face','fullFrame']){const snapshot=viewTransition[key];if(snapshot){snapshot.width=0;snapshot.height=0}}cancelAnimationFrame(viewTransitionFrame);viewTransitionFrame=0;viewTransition=null;radioDisplay.classList.remove('view-transitioning');radioDisplay.removeAttribute('aria-busy');syncDisplayNavigation()}
function commitDisplayMode(mode,{redraw=true,focusNavigation=false}={}){
 const wasHit=document.activeElement===$('#atmosphere-boombox');cancelDisplayTransition();displayMode=mode;configureDisplayMode({preserveAtmosphere:true});
 $('#enter-display').setAttribute('aria-expanded',String(mode==='boombox'));$('#enter-atmosphere').setAttribute('aria-expanded',String(mode==='atmosphere'));
 $('#radio-status').textContent=mode==='boombox'?'Boombox display. Use Scene to zoom back out.':'Atmosphere scene. Tap the boombox to zoom in.';
 syncDisplayNavigation();if(wasHit||focusNavigation&&[document.body,radioDisplay,$('#atmosphere-boombox'),$('#radio-view-switch')].includes(document.activeElement))$('#radio-view-switch').focus({preventScroll:true});
 if(redraw&&displayActive&&displayLandscape){drawRadioDisplay(musicPlaying?musicAudio.currentTime:0);if(mode==='atmosphere')startAtmosphereFrames();revealRadioControls()}
}
function finishDisplayTransition({redraw=true}={}){if(!viewTransition)return;const target=viewTransition.to,focusNavigation=viewTransition.focusNavigation;commitDisplayMode(target,{redraw,focusNavigation})}
function renderDisplayTransition(progress){
 const transition=viewTransition;if(!transition)return;
 const eased=smoothAtmosphere(progress),q=transition.from==='atmosphere'?eased:1-eased,a=transition.sceneFace,b=transition.fullFace;
 const r={x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,w:a.w+(b.w-a.w)*q,h:a.h+(b.h-a.h)*q},scale=r.w/a.w;
 const width=radioCanvas.width,height=radioCanvas.height,c=radioCtx;
 c.save();c.clearRect(0,0,width,height);c.fillStyle='#0c1517';c.fillRect(0,0,width,height);
 c.drawImage(transition.scene,r.x-a.x*scale,r.y-a.y*scale,width*scale,height*scale);
 // Blend the lit scene drawing into the same front panel used by boombox mode.
 const fade=smoothAtmosphere((q-.60)/.40);c.globalAlpha=fade;c.fillStyle='#0c1517';
 c.fillRect(0,0,width,Math.max(0,r.y));c.fillRect(0,r.y+r.h,width,Math.max(0,height-r.y-r.h));
 c.fillRect(0,r.y,Math.max(0,r.x),r.h);c.fillRect(r.x+r.w,r.y,Math.max(0,width-r.x-r.w),r.h);
 const f=transition.fullFace,fs=r.w/f.w;c.drawImage(transition.fullFrame,r.x-f.x*fs,r.y-f.y*fs,width*fs,height*fs);c.restore();
}
function animateDisplayTransition(timestamp){
 viewTransitionFrame=0;if(!viewTransition||!displayActive)return;
 if(!displayLandscape||document.hidden){finishDisplayTransition({redraw:false});return}
 if(viewTransition.start===null)viewTransition.start=timestamp;
 const progress=clamp((timestamp-viewTransition.start)/VIEW_ZOOM_MS,0,1);renderDisplayTransition(progress);
 if(progress>=1){finishDisplayTransition();return}viewTransitionFrame=requestAnimationFrame(animateDisplayTransition);
}
function switchDisplayMode(mode){
 if(!displayActive||!displayLandscape||viewTransition)return false;hardwarePointerCancel();secretPointerCancel();$('#radio-control-readout').hidden=true;
 const target=mode==='atmosphere'?'atmosphere':'boombox';if(target===displayMode)return false;
 suspendAtmosphereFrames();
 if(atmosphereReducedMotion?.matches||document.hidden){commitDisplayMode(target);return true}
 const width=radioCanvas.width,height=radioCanvas.height,g=geometry(state),scene=document.createElement('canvas'),face=document.createElement('canvas');scene.width=width;scene.height=height;face.width=Math.round(g.w*2);face.height=Math.round(g.h*2);
 renderAtmosphere(scene.getContext('2d'),state,atmosphereTime);
 ensureRadioBuffer();render(radioBufferCtx,state,musicPlaying?musicAudio.currentTime:0,{transparent:true,animate:playing||musicPlaying,hardware:true});
 face.getContext('2d').drawImage(radioBuffer,g.x*2,g.y*2,g.w*2,g.h*2,0,0,face.width,face.height);
 const fullFrame=document.createElement('canvas');fullFrame.width=width;fullFrame.height=height;drawHardwareFullscreen(fullFrame.getContext('2d'),state,musicPlaying?musicAudio.currentTime:0);
 viewTransition={fullFrame,from:displayMode,to:target,start:null,scene,face,focusNavigation:[$('#atmosphere-boombox'),$('#radio-view-switch')].includes(document.activeElement),sceneFace:atmosphereFrontRect(state,width,height),fullFace:activeSecret?secretFullRect(width,height):fitRadioFace(g,width,height)};
 radioDisplay.classList.add('view-transitioning');radioDisplay.setAttribute('aria-busy','true');syncDisplayNavigation();revealRadioControls();renderDisplayTransition(0);viewTransitionFrame=requestAnimationFrame(animateDisplayTransition);return true;
}
$('#atmosphere-boombox').addEventListener('click',e=>{if(e.detail!==0)radioDisplay.focus({preventScroll:true});switchDisplayMode('boombox')});
$('#radio-view-switch').addEventListener('click',e=>{if(e.detail!==0)radioDisplay.focus({preventScroll:true});switchDisplayMode(displayMode==='atmosphere'?'boombox':'atmosphere')});
// A tap on scenery reveals the controls; only the boombox's target starts a zoom.
radioDisplay.addEventListener('focusin',revealRadioControls);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&viewTransition)finishDisplayTransition({redraw:false})});
// End fullscreen scene navigation.
