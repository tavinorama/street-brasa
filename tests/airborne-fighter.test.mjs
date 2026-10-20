import test from 'node:test';
import assert from 'node:assert/strict';
import {roster} from '../dist/roster.js';
const tick=(g,t)=>{for(let n=0;n<Math.ceil(t*60);n++)g.update(1/60,[{},{}])};
import {Match} from '../dist/engine.js';
test('round and match endings let airborne fighters land before the finisher',()=>{
 for(const finalRound of [false,true]){const m=new Match(roster[0],roster[1],'local');tick(m,2.1);if(finalRound)m.wins[0]=1;const f=m.fighters[1];f.y=120;f.vy=80;m.damage(1,1000,0);assert.equal(m.state,finalRound?'finish':'roundover');tick(m,1);assert.equal(f.y,0);assert.equal(f.vy,0);assert.ok(f.motion.landing>=0)}
});
test('the loser of a KO or timed round falls rigidly, even with positive remaining health',()=>{for(const timed of [false,true]){const m=new Match(roster[0],roster[1],'local');tick(m,2.1);const loser=m.fighters[1];Object.assign(loser,{y:100,vy:30,attackTime:.3,block:true});if(timed){loser.hp=70;m.timer=.001;m.update(1/60)}else m.damage(1,1000,0);assert.equal(loser.defeated,true);assert.equal(loser.attackTime,0);assert.equal(loser.block,false);tick(m,1.5);assert.equal(loser.y,0);assert.equal(loser.vy,0);assert.equal(loser.motion.walk,0);assert.equal(loser.motion.action,'fall');assert.ok(loser.motion.fall>.99);tick(m,1.1);assert.equal(m.fighters[1].defeated,undefined);assert.equal(m.fighters[1].hp,100)}});
