import {impactPause} from './combat-animation.js';
import {FINISHER_DURATION,finisherBeat} from './finisher-scenes.js';
import {createMotion,stepMotion,addInjury,approach,resolveBodies,stepVertical} from './physics.js';
import {difficulty} from './preferences.js';
export const FLOOR=510;
const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
export class Match{
 constructor(left,right,mode='cpu',emit=()=>{},random=Math.random,options={}){this.difficulty=options.difficulty||'standard';this.balance=difficulty(this.difficulty);this.mode=mode;this.emit=emit;this.random=random;this.data=[left,right];this.wins=[0,0];this.round=1;this.time=0;this.effects=[];this.projectiles=[];this.state='intro';this.stateTime=2;this.timer=60;this.aiClock=0;this.aiInput={};this.sequence=[];this.winner=null;this.newRound()}
 newRound(){const injuries=this.fighters?.map(f=>f.injuries)||[[],[]];this.fighters=this.data.map((data,index)=>({data,index,x:index?920:360,y:0,vx:0,vy:0,facing:index?-1:1,hp:100,meter:25,stun:0,cooldown:0,attackTime:0,attackKind:'',attackHit:false,block:false,shield:0,dead:false,combo:0,comboClock:0,mass:68+data.power*7,motion:createMotion(index),injuries:injuries[index]||[],invulnerable:0}));this.hitstop=0;this.projectiles=[];this.effects=[];this.timer=60;this.state='intro';this.stateTime=2;this.sequence=[];this.emit('round',{round:this.round})}
 say(index,real=false){this.emit('speech',{index,real})}
 attack(index,kind){const f=this.fighters[index],enemy=this.fighters[1-index];if(this.state!=='fight'||f.stun>0||f.cooldown>0||f.block)return false;
  const cost=kind==='super'?100:kind==='special'?25:0;if(f.meter<cost){this.emit('dry',{index});return false}f.meter-=cost;f.attackKind=kind;f.attackTime=kind==='super'?.8:kind==='special'?.6:kind==='kick'?.42:.28;f.attackDuration=f.attackTime;f.strikeIn=kind==='kick'?.1:.065;f.attackWindup=f.strikeIn;f.cooldown=f.attackTime+.09;f.attackHit=false;
  this.emit('attack',{index,kind});
  if(kind==='special'||kind==='super'){
   const type=f.data.type,superMove=kind==='super';this.say(index);if(type==='projectile'||superMove){this.projectiles.push({owner:index,x:f.x+f.facing*70,y:f.y+120,vx:f.facing*(superMove?620:460),radius:superMove?38:22,damage:superMove?28:12,life:2.8,superMove,symbol:f.data.symbol,color:f.data.color})}
   else if(type==='dash'){f.vx=f.facing*920;f.dash=.28}
   else if(type==='uppercut'){f.vy=650;f.y+=1}
   else if(type==='shield'){f.shield=2;f.meter=clamp(f.meter+8,0,100);this.effects.push({type:'shield',x:f.x,y:FLOOR-f.y-100,life:.6,color:f.data.color})}
   else if(type==='area'){this.effects.push({type:'area',x:enemy.x,y:FLOOR,life:.55,color:f.data.color});this.pendingArea={owner:index,x:enemy.x,delay:.3}}
  }return true;
 }
 damage(target,amount,owner,knock=1){if(this.state!=='fight')return;if(this.mode==='cpu')amount*=target===0?this.balance.enemyDamage:1/this.balance.enemyHealth;const f=this.fighters[target],a=this.fighters[owner];if(f.invulnerable>0)return;if(f.shield>0){amount*=.18;this.emit('block',{index:target})}else if(f.block&&f.y<10){amount*=.38-f.data.guard*.04;f.motion.bodyV-=a.facing*.4;this.emit('block',{index:target})}else{f.stun=.17+Math.min(.1,amount*.003);f.vx=a.facing*(150+amount*6)*knock*90/f.mass;f.motion.bodyV-=a.facing*(1+amount*.03);f.motion.hairV-=a.facing*amount*.08;f.motion.clothV-=a.facing*amount*.05;f.invulnerable=.12;addInjury(f,amount,this.random);this.emit('hit',{index:target,damage:amount,kind:a.attackKind});a.combo++;a.comboClock=1.3;for(let i=0;i<Math.min(6,Math.ceil(amount/4));i++)this.effects.push({type:'impact',x:f.x,y:FLOOR-f.y-230,vx:a.facing*(40+this.random()*90),vy:-90-this.random()*80,life:.35+this.random()*.2,color:i%3===0?'#983e3a':'#e5c9a4'})}
  this.hitstop=Math.max(this.hitstop||0,impactPause(amount));f.hp=clamp(f.hp-amount,0,100);f.meter=clamp(f.meter+amount*1.1,0,100);a.meter=clamp(a.meter+amount*.9,0,100);this.effects.push({type:'hit',x:f.x-a.facing*20,y:FLOOR-f.y-110,life:.22,color:f.block?'#b1d2da':'#ffe1a0'});
  if(f.hp===0&&this.mode!=='training')this.endRound(owner);else if(this.mode==='training'&&f.hp<5){f.hp=100;this.emit('training-reset',{})}
 }
 endRound(winner){if(this.state!=='fight')return;this.winner=winner;this.hitstop=0;for(const f of this.fighters){f.attackTime=0;f.block=false;f.vx=0;f.stun=0}if(winner!==null){this.wins[winner]++;this.fighters[1-winner].defeated=true;}this.projectiles=[];this.pendingArea=null;
  if(winner!==null&&this.wins[winner]>=2){this.state='finish';this.stateTime=7;this.sequence=[];this.emit('finish',{winner})}else{this.state='roundover';this.stateTime=2.5;this.emit('roundover',{winner})}
 }
 finishKey(index,key){if(this.state!=='finish'||index!==this.winner)return false;const expected=['down','forward','down','fatal'];if(key===expected[this.sequence.length])this.sequence.push(key);else this.sequence=key==='down'?['down']:[];this.emit('sequence',{length:this.sequence.length});if(this.sequence.length===4){this.state='fatal';this.fatalBeat=-1;this.stateTime=FINISHER_DURATION;this.emit('fatal',{winner:index});return true}return false}
 update(dt,inputs=[{},{}]){dt=Math.min(dt,.04);if(this.state==='fight'&&this.hitstop>0){const frozen=Math.min(dt,this.hitstop);this.hitstop-=frozen;dt-=frozen;if(dt<=0)return;}this.time+=dt;this.effects.forEach(e=>{e.life-=dt;if(e.type==='impact'){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=680*dt}});this.effects=this.effects.filter(e=>e.life>0);
  if(this.state!=='fight'){
   for(const f of this.fighters){if(['roundover','finish','fatal','result'].includes(this.state))stepVertical(f,dt,1500,speed=>this.emit('land',{index:f.index,speed}));stepMotion(f,dt,this.state)}if(this.state==='result')return;this.stateTime-=dt;
   if(this.state==='finish'&&this.mode==='cpu'&&this.winner===1&&this.stateTime<4.5){this.state='fatal';this.fatalBeat=-1;this.stateTime=FINISHER_DURATION;this.emit('fatal',{winner:1})}

   if(this.state==='fatal'){const beat=finisherBeat(1-this.stateTime/FINISHER_DURATION);if(beat!==this.fatalBeat){this.fatalBeat=beat;this.emit('finisher-cue',{phase:beat})}}
   if(this.stateTime<=0){if(this.state==='intro'){this.state='fight';this.say(0,true);this.emit('fight',{})}else if(this.state==='roundover'){this.round++;this.newRound()}else if(this.state==='finish'||this.state==='fatal'){this.state='result';this.emit('result',{winner:this.winner})}}
   return;
  }
  if(this.mode!=='training'){this.timer=Math.max(0,this.timer-dt);if(!this.timer){const [a,b]=this.fighters;this.endRound(a.hp===b.hp?null:a.hp>b.hp?0:1);return}}
  if(this.mode==='cpu')inputs=[inputs[0],this.think(dt)];else if(this.mode==='training')inputs=[inputs[0],{}];
  for(const f of this.fighters){const opponent=this.fighters[1-f.index],input=inputs[f.index]||{};if(Math.abs(opponent.x-f.x)>30)f.facing=opponent.x>=f.x?1:-1;f.stun=Math.max(0,f.stun-dt);f.cooldown=Math.max(0,f.cooldown-dt);f.attackTime=Math.max(0,f.attackTime-dt);f.shield=Math.max(0,f.shield-dt);f.invulnerable=Math.max(0,f.invulnerable-dt);f.comboClock-=dt;if(f.comboClock<=0)f.combo=0;f.block=!!input.down&&f.y===0&&!f.attackTime&&!f.stun;
   if(f.dash>0){f.dash-=dt}else if(!f.stun){const desired=!f.block&&!f.attackTime?((input.right?1:0)-(input.left?1:0))*(160+f.data.speed*22):0;f.vx=approach(f.vx,desired,f.y>0?3.4:desired?13:17,dt)}else f.vx=approach(f.vx,0,f.y>0?1.2:5,dt);
   if(input.jump&&f.y===0&&!f.stun&&!f.block){f.vy=590;f.y=.1;this.emit('jump',{index:f.index})}
   stepVertical(f,dt,1500,speed=>this.emit('land',{index:f.index,speed}));
   f.x=clamp(f.x+f.vx*dt,120,1160);
   f.strikeIn=(f.strikeIn||0)-dt;if(f.attackTime>0&&!f.attackHit&&f.strikeIn<=0){const kind=f.attackKind,type=f.data.type,range=kind==='kick'?145:kind==='special'?(type==='dash'?150:type==='uppercut'?120:0):112;
    if(range&&Math.abs(f.x-opponent.x)<range&&Math.abs(f.y-opponent.y)<(type==='uppercut'?210:115)){f.attackHit=true;this.damage(opponent.index,(kind==='special'?14:kind==='kick'?8:5)+f.data.power*.75,f.index)}}
   stepMotion(f,dt,this.state);const foot=Math.floor(f.motion.gait/Math.PI);if(f.motion.walk>.4&&foot!==f.lastFoot){f.lastFoot=foot;this.emit('step',{index:f.index})}if(this.state!=='fight')break;
  }
  const [a,b]=this.fighters;resolveBodies(a,b);
  if(this.pendingArea){this.pendingArea.delay-=dt;if(this.pendingArea.delay<=0){const p=this.pendingArea,e=this.fighters[1-p.owner];if(Math.abs(e.x-p.x)<90&&e.y<100)this.damage(e.index,17,p.owner);this.pendingArea=null}}
  for(const p of this.projectiles){p.life-=dt;p.x+=p.vx*dt;const f=this.fighters[1-p.owner];if(Math.abs(p.x-f.x)<p.radius+27&&Math.abs(p.y-(f.y+110))<p.radius+65){this.damage(f.index,p.damage,p.owner,1.4);p.life=0}}
  this.projectiles=this.projectiles.filter(p=>p.life>0&&p.x>-60&&p.x<1340);
 }
 think(dt){this.aiClock-=dt;if(this.aiClock<=0){this.aiClock=this.balance.reaction+this.random()*.15;const a=this.fighters[1],b=this.fighters[0],distance=Math.abs(a.x-b.x),toward=b.x>a.x;this.aiInput={left:distance>110&&!toward,right:distance>110&&toward,down:distance<160&&b.attackTime>0&&this.random()<.55,jump:this.random()<.08};if(a.cooldown===0&&!this.aiInput.down){const r=this.random();if(a.meter>=100&&r<.15)this.attack(1,'super');else if(a.meter>=25&&r<.42)this.attack(1,'special');else if(distance<155&&r<.85)this.attack(1,this.random()<.5?'punch':'kick')}}return this.aiInput}
}
