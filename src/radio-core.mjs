export const RADIO_BANDS=[{id:'AM',start:530,step:10},{id:'FM',start:88.1,step:.1},{id:'PM',start:200.1,step:.1},{id:'GM',start:300.1,step:.1},{id:'HM',start:400.1,step:.1},{id:'JM',start:500.1,step:.1},{id:'KM',start:600.1,step:.1},{id:'LM',start:700.1,step:.1}];
export const RADIO_NAMES=['Vinyl Richie','Daft Plunk','David Guava','Calvin Harps','Tie-Toast','Marshmellow Fellow','Deadmouse Trap','Skrill-Ex Tape','Dip-Low Battery','Armin van Buffer','Carl Cogs','Fatboy Trim','Pete Pong','Paul van Dial','Steve A-Okay','Afrojackfruit','Eric Pretzels','Benny Ben-Assist','DJ Jazzy Jeff-Bot','Grandmaster Flash Drive','Mixmaster Muffin','Jam Master Replay','DJ Shadow Puppet','Questlove Seat','Mark Ron-Song','Moby Dickey','Aphex Twin Deck','Boards of Can-Do','Brian E-Note','Four Tap','Flying Low-Tus','Thundercat Nap','Bootsy Collars','George Clip-Ton','James Brown-Out','Stevie Wonder-Watt','Ray Charles-In-Charge','Elton Jukebox','Billy Joystick','Freddie Mercury Switch','David Boombox','Prince of Play','Madonna Cassette','Cyndi Loop-er','Debbie Harps','Tina Turner-Table','Donna Summer-Loop','Rick Ast-Loop','Snoop Loop','Missy Rewind'];
export const RADIO_EFFECTS=['announce','airhorn','laser','rewind','applause','chime','static'];
export function radioFrequency(band,channel){const b=RADIO_BANDS.find(b=>b.id===band);return b?(b.start+b.step*channel).toFixed(b.id==='AM'?0:1):''}
export function radioPosition(session,now=Date.now()){
 const tracks=session.tracks||[],total=tracks.reduce((sum,t)=>sum+t.duration*1000,0);
 if(!total)return {ended:true,index:0,seconds:0,position:0};
 let elapsed=Math.max(0,session.positionMs+(session.paused?0:Math.max(0,now-session.anchorAt)));
 if(!session.repeat&&elapsed>=total)return {ended:true,index:tracks.length-1,seconds:tracks.at(-1).duration,position:total};
 elapsed%=total;const position=elapsed;
 for(let index=0;index<tracks.length;index++){const length=tracks[index].duration*1000;if(elapsed<length)return {ended:false,index,seconds:elapsed/1000,position};elapsed-=length}
 return {ended:false,index:0,seconds:0,position:0};
}
export function radioAnnouncement(station){return 'This is '+station.letters.split('').join(' ')+' on '+station.band.split('').join(' ')+' '+station.frequency.replace('.', ' point ')+'. Your host is '+station.nickname+'. You are listening to Boombox Atelier radio.'}
