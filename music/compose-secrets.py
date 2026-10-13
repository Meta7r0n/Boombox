"""Synthesized secret instrumentals: no sampled commercial recordings or vocals.
Disco reworks the familiar short Funkytown/telephone riff; Twilight is an original
suspense cue; the farm arrangement uses the public-domain nursery melody.
"""
from pathlib import Path
import numpy as np, wave, subprocess, json
SR=32000
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/music/secrets';OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(1981)
def f(m):return 440*2**((m-69)/12)
def note(m,d,kind='bell'):
 t=np.arange(int(d*SR))/SR;p=2*np.pi*f(m)*t
 if kind=='bell':y=np.sin(p)*np.exp(-t*2.4)+.25*np.sin(p*2.76)*np.exp(-t*6)+.09*np.sin(p*5.41)*np.exp(-t*10);attack=.008
 elif kind=='clav':y=(np.sin(p)+.4*np.sin(p*2)+.23*np.sin(p*3)+.08*np.sin(p*5))*np.exp(-t*5.5);attack=.004
 elif kind=='lead':y=.75*np.sin(p+.2*np.sin(2*np.pi*5*t))+.26*np.sin(p*2)+.12*np.sin(p*3);attack=.008
 elif kind=='pad':y=(np.sin(p)+np.sin(p*1.002+.6))*.42+.1*np.sin(p*2);attack=.6
 else:y=np.sin(p)+.18*np.sin(p*2);attack=.006
 env=np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,(d-t)/min(.16,d/3)))
 return y*env
catalog=[]
for egg,bpm,bars,title,desc,color in [
 ('farm',90,24,'Mary Had a Little Lamb · Meadow Mix','Music-box nursery melody, soft keys and pastoral rhythm','#eedca0'),
 ('twilight',76,24,'Twilight Frequency · Eerie Transmission','Original eerie bells, drifting drones and tape echoes','#a8a8ba'),
 ('disco',120,32,'Funkytown · Keypad Disco Remix','Synthesized instrumental riff rework with disco bass and clavinet','#c190d4')]:
 beat=60/bpm;bar=beat*4;duration=bars*bar+3;dry=np.zeros((int(duration*SR),2),np.float32)
 def add(y,at,gain,pan=0):
  start=int(at*SR);end=min(len(dry),start+len(y));y=y[:end-start]*gain;dry[start:end,0]+=y*(.72-.28*pan);dry[start:end,1]+=y*(.72+.28*pan)
 for b in range(bars):
  at=b*bar;level=.48 if b<2 or b>=bars-2 else 1
  if egg=='twilight':
   chord=[45,52,58,64] if b%4<2 else [44,51,57,63]
   for j,m in enumerate(chord):add(note(m,bar+.7,'pad'),at,.085*level,(j-1.5)/2)
   for k,m in enumerate([78,77,73,74] if b%2==0 else [74,73,69,70]):add(note(m,beat*.65),at+k*beat,.1*level,(-1)**k*.6)
   t=np.arange(int(bar*SR))/SR;noise=rng.standard_normal(len(t));noise=np.convolve(noise,np.ones(24)/24,'same');add(noise*np.sin(np.pi*t/bar)**2,at,.032)
   add(note(33,beat*1.8,'bass'),at,.12*level)
   continue
  root=48 if egg=='farm' else [36,36,41,43][(b//2)%4]
  chord=[root+12,root+16,root+19] if egg=='farm' else [root+24,root+28,root+31,root+34]
  for j,m in enumerate(chord):add(note(m,bar+.15,'pad'),at,.045*level,(j-1)/2)
  for k in range(8 if egg=='disco' else 4):
   pitch=root+[0,0,7,10,12,10,7,0][k%8] if egg=='disco' else root+(7 if k%2 else 0)
   add(note(pitch,beat*.35,'bass'),at+k*beat*(.5 if egg=='disco' else 1),.21*level)
  for k in (range(4) if egg=='disco' else [0,2]):
   t=np.arange(int(.24*SR))/SR;kick=np.sin(2*np.pi*(44*t+1.9*(1-np.exp(-t/.022))))*np.exp(-t*18);add(kick,at+k*beat,.36*level)
  for k in [1,3]:
   t=np.arange(int(.16*SR))/SR;noise=rng.standard_normal(len(t));clap=np.r_[noise[0],np.diff(noise)]*np.exp(-t*30);add(clap,at+k*beat,.07*level,.15)
  for k in range(8):
   t=np.arange(int(.06*SR))/SR;hat=rng.standard_normal(len(t))*np.exp(-t*80);add(hat,at+k*beat/2,.025*level,(-1)**k*.45)
  if egg=='farm':
   melody=[64,62,60,62,64,64,64,None,62,62,62,None,64,67,67,None,64,62,60,62,64,64,64,64,62,62,64,62,60,None,None,None]
   for k in range(4):
    m=melody[(b*4+k)%len(melody)]
    if m is not None:add(note(m+12,beat*1.5),at+k*beat,.17*level,0)
   if b%2==0:
    for m in chord:add(note(m+12,beat*1.7,'bell'),at,.045*level,-.4)
  else:
   for k in [.5,1.5,2.5,3.5]:
    for j,m in enumerate(chord):add(note(m,beat*.5,'clav'),at+k*beat,.08*level,(j-1.5)/2)
   riff=[(0,72),(.5,72),(1,70),(1.5,72),(2.5,67),(3,67),(4,72),(4.5,77),(5,76),(5.5,72)]
   if b%2==0 and 2<=b<bars-2:
    for k,m in riff:add(note(m,beat*.38,'lead'),at+k*beat,.145*level,.1)
 wet=dry.copy()
 for delay,gain in ([(beat*.75,.26),(beat*1.5,.13),(.08,.09),(.17,.07)] if egg=='twilight' else [(beat*.5,.15),(.075,.07),(.12,.05)]):
  n=int(delay*SR);wet[n:]+=dry[:-n,::-1]*gain
 times=np.arange(len(wet))/SR;fade=np.minimum(1,times/1.5)*np.minimum(1,(duration-times)/4);wet=np.tanh(wet)*fade[:,None];wet*=.88/max(.01,np.max(np.abs(wet)))
 wav=OUT/(egg+'.wav');mp3=OUT/(egg+'.mp3')
 with wave.open(str(wav),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((wet*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k','-metadata','title='+title,'-metadata','artist=Boombox Atelier',str(mp3)],check=True);wav.unlink()
 catalog.append(dict(id='secret-'+egg,egg=egg,title=title,artist='Boombox Atelier',description=desc,duration=round(duration,2),bpm=bpm,color=color,url='/music/secrets/'+egg+'.mp3',source='secret'))
 print(title,round(duration,2),'seconds')
existing=ROOT/'music/secrets.json'
extra=[song for song in json.loads(existing.read_text()) if song['egg'] not in {'farm','twilight','disco'}] if existing.exists() else []
existing.write_text(json.dumps(catalog+extra,indent=2)+'\n')
