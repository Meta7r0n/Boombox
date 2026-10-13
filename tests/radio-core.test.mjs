import assert from 'node:assert/strict';
import {RADIO_BANDS,RADIO_NAMES,radioPosition,radioFrequency,radioAnnouncement} from '../src/radio-core.mjs';
const channels=RADIO_BANDS.flatMap(b=>Array.from({length:199},(_,i)=>b.id+' '+radioFrequency(b.id,i)));assert.equal(new Set(channels).size,1592);assert.equal(radioFrequency('FM',198),'107.9');assert.equal(RADIO_NAMES.length,50);
const session={tracks:[{duration:10},{duration:20}],positionMs:500,anchorAt:1000,paused:false,repeat:true};
assert.deepEqual(radioPosition(session,12500),{ended:false,index:1,seconds:2,position:12000});assert.deepEqual(radioPosition(session,31500),{ended:false,index:0,seconds:1,position:1000});assert.equal(radioPosition({...session,paused:true},1000000).seconds,.5);assert.equal(radioPosition({...session,repeat:false},31000).ended,true);assert.equal(radioPosition(session,0).seconds,.5);
assert.match(radioAnnouncement({letters:'DUB',band:'FM',frequency:'88.1',nickname:'Vinyl Richie'}),/D U B.*F M 88 point 1.*Vinyl Richie/);
console.log(JSON.stringify({status:'passed',coverage:['1592 unique virtual channels','50 nickname choices','shared program boundaries and looping','paused clock','single-pass completion','future anchor safety','spoken station identity']}));
