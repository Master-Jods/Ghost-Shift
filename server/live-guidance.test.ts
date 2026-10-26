import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepared} from './analytics';
import {defaultConfig,reduce} from '../src/engine';
import {liveGuidance} from '../src/liveGuidance';
import {fieldMaterialKey} from '../src/fieldAnalysis';
import {quickPlans} from './quickAnalysis';
import {pathLength,invalidateDoorCache,gateControl} from '../src/world';
function live(){let s=prepared(defaultConfig);for(let i=0;i<12;i++)s=reduce(s,{type:'FRAME',value:.25});return s;}
test('nearby assignments replace completed tasks immediately; movement changes the forecast key within a room',()=>{
 const s=live(),coolant=s.tasks.find(t=>t.mode==='coolant')!,signal=s.tasks.find(t=>t.mode==='signal')!;s.players.A.position={...coolant.position};s.players.B.position={...signal.position};
 assert.equal(liveGuidance(s).find(v=>v.role==='A')?.targetId,coolant.id);
 assert.equal(liveGuidance(s).find(v=>v.role==='B')?.targetId,signal.id);
 const key=fieldMaterialKey(s,'A');s.players.A.position.x+=150;assert.notEqual(fieldMaterialKey(s,'A'),key);
 coolant.complete=true;s.revision++;assert.ok(liveGuidance(s).every(v=>v.targetId!==coolant.id));
});
test('guidance uses canonical closed-door travel and does not mutate the session',()=>{
 const s=live();s.tasks.forEach(t=>t.complete=t.mode!=='coolant');const t=s.tasks.find(t=>t.mode==='coolant')!;s.players.A.position=gateControl('hub-shortcut');s.players.B.position={...t.position};
 s.route.sealed.push('hub-shortcut');s.revision++;invalidateDoorCache(s);const before=JSON.stringify(s),steps=liveGuidance(s),b=steps.find(v=>v.role==='B')!;assert.equal(b.targetId,t.id);assert.equal(b.travelSeconds,Math.ceil(pathLength(s.players.B.position,t.position,s)/185));assert.equal(JSON.stringify(s),before);
});
test('live emergency guidance overrides tasks; forecast exposes deadline sensitivity without fake probabilities',()=>{
 let s=live();s=reduce(s,{type:'INJECT',role:'control',value:{kind:'emergency',eventKind:'blackout',target:'A',severity:1,duration:60,scope:'A',blocking:true}});
 assert.match(liveGuidance(s).find(v=>v.role==='A')!.text,/Resolve Blackout/);
 s.elapsed=s.emergencies[0].expiresAt-1;const f=quickPlans(s).best.forecast;assert.equal(f.probability,0);assert.equal(f.emergencyMissRisk,1);assert.deepEqual(f.delaySensitivity?.map(v=>v.probability),[0,0]);
});
