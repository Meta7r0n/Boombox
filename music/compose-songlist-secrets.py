"""Original synthesized arrangements of four traditional telephone-song melodies.
No commercial recordings, samples or vocals. Adds only the three new tracks.
"""
from pathlib import Path
import numpy as np, wave, subprocess, json
SR=32000
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/music/secrets';OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(1890)
def tone(m,d,kind='keys'):
 t=np.arange(int(d*SR))/SR;p=2*np.pi*440*2**((m-69)/12)*t
 if kind=='pad':y=.55*np.sin(p)+.32*np.sin(p*1.002+.4)+.08*np.sin(p*2);attack=.18
 elif kind=='bell':y=np.sin(p)*np.exp(-t*2)+.23*np.sin(p*2.76)*np.exp(-t*5);attack=.005
 elif kind=='bass':y=np.sin(p)+.16*np.sin(p*2);attack=.006
 elif kind=='flute':y=np.sin(p+.025*np.sin(t*2*np.pi*5))+.12*np.sin(p*2);attack=.025
 else:y=(np.sin(p)+.35*np.sin(p*2)+.13*np.sin(p*3))*np.exp(-t*3);attack=.006
 env=np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,(d-t)/min(.15,d/3)))
 return y*env
# Familiar melodies, note and duration in beats; original instrument arrangements.
buns=[(64,1),(62,1),(60,2),(64,1),(62,1),(60,2),(60,.5),(60,.5),(60,.5),(60,.5),(62,.5),(62,.5),(62,.5),(62,.5),(64,1),(62,1),(60,2)]
birthday=[(67,.75),(67,.25),(69,1),(67,1),(72,1),(71,2),(67,.75),(67,.25),(69,1),(67,1),(74,1),(72,2),(67,.75),(67,.25),(79,1),(76,1),(72,1),(71,1),(69,2),(77,.75),(77,.25),(76,1),(72,1),(74,1),(72,2)]
star=[(60,1),(60,1),(67,1),(67,1),(69,1),(69,1),(67,2),(65,1),(65,1),(64,1),(64,1),(62,1),(62,1),(60,2),(67,1),(67,1),(65,1),(65,1),(64,1),(64,1),(62,2),(67,1),(67,1),(65,1),(65,1),(64,1),(64,1),(62,2),(60,1),(60,1),(67,1),(67,1),(69,1),(69,1),(67,2),(65,1),(65,1),(64,1),(64,1),(62,1),(62,1),(60,2)]
winter=[(64,1),(64,1),(64,2),(64,1),(64,1),(64,2),(64,1),(67,1),(60,1.5),(62,.5),(64,4),(65,1),(65,1),(65,1.5),(65,.5),(65,1),(64,1),(64,1),(64,.5),(64,.5),(64,1),(62,1),(62,1),(64,1),(62,2),(67,2)]
new=[]
for egg,bpm,melody,title,desc,color in [
 ('buns',92,buns,'Hot Cross Buns · Sunrise Bakery Mix','Warm bakery keys, soft acoustic bass and breakfast-time bells','#e7b365'),
 ('birthday',110,birthday,'Happy Birthday · Rooftop Celebration','Bright electric piano, twinkling bells and warm birthday chords','#ec80b3'),
 ('star',78,star,'Twinkle Twinkle · Starlight Lullaby','Slow music-box bells and floating observatory pads','#9ba8ed'),
 ('winter',116,winter,'Jingle Bells · Snowglobe Mix','Festive bell melody over gentle winter keys and bright chords','#bd615d')]:
 beat=60/bpm;phrase=sum(d for m,d in melody);duration=round(phrase*beat*3+3,2);dry=np.zeros((int(duration*SR),2),np.float32)
 def add(y,at,gain,pan=0):
  i=int(at*SR);j=min(len(dry),i+len(y));dry[i:j,0]+=y[:j-i]*gain*(.72-.28*pan);dry[i:j,1]+=y[:j-i]*gain*(.72+.28*pan)
 for repeat in range(3):
  at=repeat*phrase*beat
  for m,d in melody:
   if m is not None:
    kind='bell' if egg in ['star','winter'] else 'keys'
    add(tone(m+(12 if repeat==1 and egg in ['star','winter'] else 0),max(.13,d*beat*.92),kind),at,.19,.1)
    if repeat==2:add(tone(m-12,d*beat*.85,'keys'),at,.04,-.45)
   at+=d*beat
 beats=int(phrase*3)
 for k in range(beats):
  at=k*beat
  roots=[48,53,43,48];root=roots[(k//8)%4]
  if egg in ['buns','birthday']:
   if k%2==0:add(tone(root+(7 if k%4==2 else 0),beat*.75,'bass'),at,.18,-.25)
   else:
    for n in [root+12,root+16,root+19]:add(tone(n,beat*.65),at,.06,.3)
  else:
   if k%4==0:
    for n in [root+12,root+16,root+19]:add(tone(n,beat*4+.3,'pad'),at,.055,(n-root-16)/8)
    add(tone(root,beat*2,'bass'),at,.12)
   if k%2==0:add(tone(root+24+(7 if k%4 else 0),beat*.8),at,.035,-.5)
 wet=dry.copy()
 for delay,gain in [(beat*.5,.13),(.075,.08),(.14,.05)]:
  n=int(delay*SR);wet[n:]+=dry[:-n,::-1]*gain
 t=np.arange(len(wet))/SR;wet=np.tanh(wet)*np.minimum(1,t/1.2)[:,None]*np.minimum(1,(duration-t)/3)[:,None];wet*=.86/max(.01,np.max(np.abs(wet)))
 wav=OUT/(egg+'.wav');mp3=OUT/(egg+'.mp3')
 with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((wet*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k','-metadata','title='+title,'-metadata','artist=Boombox Atelier',str(mp3)],check=True);wav.unlink()
 new.append(dict(id='secret-'+egg,egg=egg,title=title,artist='Boombox Atelier',description=desc,duration=duration,bpm=bpm,color=color,url='/music/secrets/'+egg+'.mp3',source='secret'))
 print(title,duration)
p=ROOT/'music/secrets.json';catalog=[s for s in json.loads(p.read_text()) if s['egg'] not in ['buns','birthday','star','winter']];p.write_text(json.dumps(catalog+new,indent=2)+'\n')
