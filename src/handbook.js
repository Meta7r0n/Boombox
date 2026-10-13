// Contextual handbook. Opening it never changes playback or display mode.
let handbookOpener=null;
function handbookDescription(p){
 if(radioListening&&['knob','tuner'].includes(p.kind)&&p.key==='seek')return 'You are tuned to a live program. Its shared clock returns the tuner to the live position. Leave the station to seek through your own tape.';
 if(radioListening&&p.kind==='transport'&&[2,4,5].includes(p.key))return 'Leaves the live station and returns to your cassette player. Use the radio host desk to skip or stop the shared broadcast.';
 if(p.kind==='eq'){const hz=[60,170,350,1000,3500,6000,12000][p.key];return hz+' Hz · drag up to boost, down to cut (−12 to +12 dB). Low bands shape bass, middle bands shape voices, high bands shape brightness. Center at 0 dB is neutral.'}
 if(p.kind==='knob'||p.kind==='tuner')return ({volume:'Master song volume, 0–100%. Speaker level knobs control this same master volume. Raising it also releases Mute.',bass:'Low-frequency tone, −12 to +12 dB. Center at 0 adds no boost or cut.',treble:'High-frequency tone, −12 to +12 dB. Center at 0 adds no boost or cut.',balance:'Left/right placement. Center at 0 plays both sides; extremes send sound to one side.',seek:'Song position, 0–100%. This tuner seeks within your song; it does not tune a live radio station. At 100%, the song ends.'})[p.key]||'Drag to adjust.';
 if(p.kind==='transport'&&activeSecret&&p.key>=4)return p.key===4?'Tap to go to the previous song, or restart this song after 3 seconds.':'Tap to play the next song.';
 if(p.kind==='transport')return ['Opens the cassette shelf and pauses music. Choose a tape, then press Play.','Starts or resumes the song and turns power on. Mute stays as you set it; volume can still be zero.','Stops music and returns to the start of this song.','Pauses music without changing position. Press Play to continue.','Tap: previous song (or restart this song after 3 seconds). Hold: rewind within the song.','Tap: next song. Hold: fast-forward within the song.'][p.key];
 if(p.kind==='switch')return ['Repeats the loaded tape when it ends.','Silences the song without stopping its timeline. Tap again to unmute.','Combines left/right sound into one channel. Some stereo recordings lose elements in mono; turn it off for full stereo.','Adds 6 dB of low-frequency boost, on top of the Bass knob.','Adds 5 dB of high-frequency boost, on top of the Treble knob.','Plays at half speed. Turn off for normal speed. Pitch behavior depends on your browser.','Chooses and plays a random song from the loaded tape. A single-song tape has only one choice.','Turns the radio off and pauses music. Turning it back on resumes if it was playing. Play also turns power on.'][p.key];
 if(p.kind==='deck')return 'Tap to open or close the cassette deck. Opening pauses music and reveals the cassette shelf.';
 if(p.kind==='handle')return 'Tap to fold or lift the carrying handle. Visual only; it does not affect sound.';
 if(p.kind==='antenna')return 'Drag to tilt and extend. Visual only; uploaded songs do not depend on radio reception. Use Full radio to see it.';
 if(p.kind==='port')return p.key===0?'An information jack. Connect headphones through your phone or computer’s audio output; tapping this jack keeps music playing.':'An information jack. Import MP3/WAV files in Music & tapes. Live microphone recording is not available.';
 return 'Tap to use this control.';
}
function handbookControlState(p){
 if(['eq','knob','tuner','antenna'].includes(p.kind))return hardwareReading(p);
 if(p.kind==='switch'){if(p.key===6)return 'Momentary';return (p.key===7?hardwareLive.power:p.key===1?musicAudio.muted:p.key===0?musicRepeat:hardwareLive.switches[p.key])?'On':'Off'}
 if(p.kind==='deck')return hardwareLive.empty?'Empty':hardwareLive.door===p.key?'Open':'Closed';
 if(p.kind==='handle')return hardwareLive.handle?'Folded':'Raised';
 return '';
}
function handbookSoundStatus(){
 const issues=[];if(typeof radioListening!=='undefined'&&radioListening){if(radioListening.paused)issues.push('The station host has paused the broadcast.');if(radioListening.level===0)issues.push('The host’s broadcast music level is zero. Your local controls cannot change the host fader.');}
 if(!currentSong())issues.push('No song loaded. Insert a cassette or select a song in Music & tapes.');
 if(hardwareLive.empty)issues.push('The cassette deck is empty.');
 if(!hardwareLive.power)issues.push('Power is off.');
 if(musicAudio.muted)issues.push('Mute is on.');
 if(musicAudio.volume===0)issues.push('Volume is zero.');
 if(hardwareLive.door>=0)issues.push('The cassette door is open.');
 if(musicAudio.error)issues.push('This audio file could not load. Reconnect your profile or choose another song.');
 if(musicAudio.ended)issues.push('The song has ended.');
 else if(musicAudio.paused&&currentSong())issues.push('Playback is paused.');
 if(hardwareAudio&&hardwareAudio.context.state!=='running')issues.push('The audio engine is '+hardwareAudio.context.state+'. Tap Restore sound to resume it.');
 return (issues.length?issues.join(' '):'Playback is active.')+' Volume '+Math.round(musicAudio.volume*100)+'% · '+(musicAudio.muted?'muted':'unmuted')+' · '+(hardwareLive.switches[2]?'mono':'stereo')+' · '+musicAudio.playbackRate+'× speed.';
}
function refreshHandbook(){
 if(!$('#handbook').open)return;
 $('#handbook-state').textContent=handbookSoundStatus();
 const list=$('#handbook-controls');list.replaceChildren();const seen=new Set();
 for(const p of (activeSecret?secretParts(activeSecret):hardwareParts(state))){const key=p.kind+':'+p.key;if(seen.has(key))continue;seen.add(key);const row=node('div','handbook-control'),term=node('dt','',p.label),value=handbookControlState(p);if(value)term.append(node('small','',value));row.append(term,node('dd','',handbookDescription(p)));list.append(row)}
}
function openHandbook(e){
 handbookOpener=e?.currentTarget||document.activeElement;
 hardwarePointerCancel();secretPointerCancel();
 const d=$('#handbook'),parent=displayActive?radioDisplay:document.body;
 if(d.parentNode!==parent)parent.append(d);d.showModal();refreshHandbook();$('#handbook-close').focus({preventScroll:true});
}
async function restoreHardwareSound(){
 hardwareLive.bass=0;hardwareLive.treble=0;hardwareLive.balance=0;hardwareLive.eq.fill(0);
 for(const i of [1,2,3,4,5,7])hardwareLive.switches[i]=false;
 hardwareLive.power=true;hardwareLive.powerResume=false;musicAudio.muted=false;musicAudio.playbackRate=1;
 setHardwareValue({kind:'knob',key:'volume',label:'Volume'},65);applyHardwareSound();
 if(currentSong()){if(!$('#hardware-shelf').hidden)closeHardwareShelf();hardwareLive.door=-1;hardwareLive.empty=false;await playMusic();}
 else await resumeHardwareSound().catch(()=>{});
 hardwareChanged();refreshHandbook();hardwareAnnounce(currentSong()?'Neutral sound settings restored.':'Sound settings restored. Insert a cassette to play.');
}
for(const id of ['handbook-open','handbook-open-display'])$('#'+id).addEventListener('click',openHandbook);
$('#handbook-close').addEventListener('click',()=>$('#handbook').close());
$('#handbook-restore').addEventListener('click',()=>void restoreHardwareSound());
$('#handbook').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();$('#handbook').close()}});
$('#handbook').addEventListener('close',()=>{if(displayActive)revealRadioControls();handbookOpener?.focus({preventScroll:true})});
for(const name of ['play','pause','volumechange','ratechange','error','ended'])musicAudio.addEventListener(name,()=>{if($('#handbook').open)refreshHandbook()});
