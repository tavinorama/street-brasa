import test from 'node:test';
import assert from 'node:assert/strict';
import {roster} from '../dist/roster.js';
const tick=(g,t)=>{for(let n=0;n<Math.ceil(t*60);n++)g.update(1/60,[{},{}])};
import {Match} from '../dist/engine.js';
test('round and match endings let airborne fighters land before the finisher',()=>{
 for(const finalRound of [false,true]){const m=new Match(roster[0],roster[1],'local');tick(m,2.1);if(finalRound)m.wins[0]=1;const f=m.fighters[1];f.y=120;f.vy=80;m.damage(1,1000,0);assert.equal(m.state,finalRound?'finish':'roundover');tick(m,1);assert.equal(f.y,0);assert.equal(f.vy,0);assert.ok(f.motion.landing>=0)}
});
