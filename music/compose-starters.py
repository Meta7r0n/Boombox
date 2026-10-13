"""Original procedural instrumental compositions. No sampled recordings."""
from pathlib import Path
import numpy as np, wave, subprocess, json
SR=32000
OUT=Path(__file__).resolve().parents[1]/'public/music'
OUT.mkdir(parents=True,exist_ok=True)
R=np.random.default_rng(1988)
def freq(m): return 440*2**((m-69)/12)
def voice(m,dur,kind):
 t=np.arange(int(dur*SR))/SR; f=freq(m)
 if kind=='pad':
  y=sum(np.sin(2*np.pi*f*(1+det)*t + phase) for det,phase in [(-.002,0),(.002,.4),(0,.8)])/3
  y+=.13*np.sin(2*np.pi*f*2*t); attack=.30; release=.7
 elif kind=='keys':
  y=np.sin(2*np.pi*f*t+1.8*np.exp(-t*3)*np.sin(2*np.pi*f*2*t))*.7+.18*np.sin(2*np.pi*f*3*t)*np.exp(-t*5);y*=np.exp(-t*1.1);attack=.012;release=.15
 elif kind=='lead':
  y=(np.sin(2*np.pi*f*t+0.03*np.sin(2*np.pi*5*t))+.23*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t))*.7;attack=.018;release=.11
 else:
  y=.8*np.sin(2*np.pi*f*t)+.15*np.sin(2*np.pi*f*2*t);attack=.007;release=.08
 env=np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,(dur-t)/release))
 return y*env
catalog=[]
settings=[
 ('sunset-circuit','Sunset Circuit',104,[[57,60,64,67],[53,57,60,64],[60,64,67,71],[55,59,62,69]], [76,79,81,79,76,74,72,74], 'Warm synth-pop · rooftop hour','#d48c65'),
 ('midnight-local','Midnight Local',92,[[50,53,57,60],[55,58,62,65],[48,52,55,59],[53,57,60,64]],[69,72,74,77,76,74,72,69], 'Electric keys · after-hours train','#8199b7'),
 ('saltwater-memory','Saltwater Memory',80,[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]],[79,76,74,72,76,79,81,79], 'Soft coastal groove · sea breeze','#8ab6a5')]
for num,(id,title,bpm,chords,melody,description,color) in enumerate(settings):
 beat=60/bpm; bar=beat*4; duration=32*bar+3
 dry=np.zeros((int(duration*SR),2),np.float32)
 def add(y,at,gain,pan=0):
  start=int(at*SR); end=min(len(dry),start+len(y)); y=y[:end-start]*gain
  dry[start:end,0]+=y*(.76-.3*pan);dry[start:end,1]+=y*(.76+.3*pan)
 for b in range(32):
  chord=chords[(b//2)%4]; start=b*bar; intensity=.48 if b<4 or b>=28 else 1
  for j,m in enumerate(chord):add(voice(m,bar+.25,'pad'),start,.085*intensity,(j-1.5)/2)
  if b>=2:
   for k in range(4):add(voice(chord[0]-12 if k!=3 else chord[2]-12,beat*.82,'bass'),start+k*beat,.23*intensity)
  if b>=4:
   for k in [0,2]:
    t=np.arange(int(.28*SR))/SR; y=np.sin(2*np.pi*(45*t+90*.018*(1-np.exp(-t/.018))))*np.exp(-t*17)
    add(y,start+k*beat,.5*intensity)
   for k in [1,3]:
    t=np.arange(int(.16*SR))/SR; noise=R.standard_normal(len(t)); noise=np.r_[noise[0],np.diff(noise)]*.3
    y=noise*np.exp(-t*26)+.16*np.sin(2*np.pi*185*t)*np.exp(-t*30);add(y,start+k*beat,.32*intensity,.1)
   for k in range(8):
    t=np.arange(int(.055*SR))/SR; y=R.standard_normal(len(t))*np.exp(-t*85);add(y,start+k*beat/2,.047*intensity,(-1)**k*.45)
  for k in range(4 if num!=2 else 2):
   at=start+(k+.5)*beat if num!=2 else start+k*beat*2
   for j,m in enumerate(chord):add(voice(m+12,beat*1.65,'keys'),at,.067*intensity,(j-1.5)/2)
  if 8<=b<28:
   for k in range(4):
    if (b+k)%7==0:continue
    m=melody[(b*2+k)%len(melody)]+(0 if b<16 else (-12 if num==2 else 0))
    add(voice(m,beat*(1.35 if k==3 else .7),'lead'),start+k*beat+beat*.08,.11 if num!=2 else .075,.1)
 # Stereo tape echo and gentle reverb; no hard clipping.
 wet=dry.copy()
 for delay,gain in [(beat*.75,.18),(beat*1.5,.08),(.073,.06),(.127,.05)]:
  shift=int(delay*SR);wet[shift:]+=dry[:-shift,::-1]*gain
 fade=np.minimum(1,np.arange(len(wet))/SR/2)*np.minimum(1,(len(wet)-np.arange(len(wet)))/SR/5)
 wet*=fade[:,None]; wet=np.tanh(wet*1.15);wet*=.88/max(.01,np.abs(wet).max())
 wav=OUT/(id+'.wav'); mp3=OUT/(id+'.mp3')
 with wave.open(str(wav),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((wet*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','112k','-metadata','title='+title,'-metadata','artist=Boombox Atelier Originals',str(mp3)],check=True)
 wav.unlink()
 catalog.append(dict(id='starter-'+id,title=title,artist='Boombox Atelier Originals',description=description,duration=round(duration,2),bpm=bpm,color=color,url='/music/'+mp3.name,source='starter'))
 print(title,round(duration,1),'seconds',mp3.stat().st_size,'bytes')
(OUT.parents[1]/'music/catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
