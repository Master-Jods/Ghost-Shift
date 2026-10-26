import {test} from 'node:test';import assert from 'node:assert/strict';
import {walkable,roomEquipment,wallSegments,colliderIntersects,doors,gateDefinitions,move,center,MAP_SIGNATURE} from './world';
import {initial,reduce,defaultConfig} from './engine';import {prepared} from '../server/analytics';import {objectives} from './objectives';import {journalTabIntent} from './gameInput';
const local=(id:string,u:number,v:number)=>{const e=roomEquipment.find(e=>e.roomId===id)!;return {x:e.anchor.x+e.tangent.x*u+e.normal.x*v,y:e.anchor.y+e.tangent.y*u+e.normal.y*v};};
test('regression: empty coolant-pipe gap and reactor bay corner are walkable while visible solids block',()=>{
 assert.ok(walkable(local('cooling',0,25)));assert.ok(walkable(local('reactor',-50,32)));
 assert.equal(walkable(local('cooling',28,7)),false);assert.equal(walkable(local('reactor',0,14)),false);
 const box={id:'corner',roomId:'test',shape:'box' as const,x:0,y:0,w:10,h:10};assert.equal(colliderIntersects(box,{x:20,y:20},11),false);assert.equal(colliderIntersects(box,{x:17,y:17},11),true);

});
test('authoritative movement for A and B crosses the formerly invisible bay with no correction; real gate states remain solid',()=>{
 let s=prepared(defaultConfig);for(let i=0;i<12;i++)s=reduce(s,{type:'FRAME',value:.25});for(const role of ['A','B'] as const){s.players[role].position=local('cooling',0,25);s=reduce(s,{type:'INPUT',role,value:{x:1,y:0}});}s=reduce(s,{type:'FRAME',value:.05});for(const role of ['A','B'] as const)assert.ok(s.players[role].position.x>local('cooling',0,25).x+8);
 const d=gateDefinitions[0],p={x:d.x+d.w/2,y:d.y+d.h/2},locked=initial(),open=initial();open.tasks.find(t=>t.kind==='circuit')!.complete=true;assert.equal(walkable(p,locked),false);assert.ok(walkable(p,open));const vertical=d.h>d.w,start={x:p.x+(vertical?-d.w/2-24:0),y:p.y+(vertical?0:-d.h/2-24)},v={x:vertical?1:0,y:vertical?0:1};let blocked=start,clear=start;for(let i=0;i<12;i++){blocked=move(blocked,v,.1,locked);clear=move(clear,v,.1,open);}assert.ok(vertical?blocked.x<d.x:blocked.y<d.y);assert.ok(vertical?clear.x>d.x+d.w:clear.y>d.y+d.h);

 assert.match(MAP_SIGNATURE,/aster-wings-v9-pokemon-rooms:[0-9a-f]+/);
});
test('journal follows actual transfer/cooperative progress and emergency lifecycle without changing snapshots',()=>{
 let s=initial(),base=s.tasks[0];s.tasks=[{...base,id:'transfer',mode:'transfer',position:center('archive'),destination:center('comms'),complete:false,carrier:undefined},{...base,id:'cooperative',mode:'cooperative',role:'both',position:center('reactor'),secondPosition:{x:center('reactor').x+60,y:center('reactor').y},complete:false,activated:{A:12}}];
 const before=JSON.stringify(s),items=objectives(s,'B');assert.equal(items[0].room,"Professor Oak's Research Lab");assert.equal(items[1].position.x,s.tasks[1].secondPosition!.x);assert.match(items[1].instructions,/12 active seconds/);assert.equal(items[1].progress,'1/2 controls');assert.equal(JSON.stringify(s),before);
 s.tasks[0].carrier='A';assert.equal(objectives(s,'A')[0].room,'Rotom Relay Station');assert.equal(objectives(s,'A')[0].locations[0].status,'Complete');s.tasks[0].complete=true;assert.equal(objectives(s,'A')[0].status,'Complete');
 let live=prepared(defaultConfig);for(let i=0;i<12;i++)live=reduce(live,{type:'FRAME',value:.25});live=reduce(live,{type:'INJECT',role:'control',value:{kind:'emergency',eventKind:'reactor',target:'A',severity:1,duration:120,scope:'both',blocking:true}});const emergency=objectives(live,'B').find(o=>o.category==='emergency')!;assert.equal(emergency.deadline,60);assert.equal(emergency.locations.length,2);live=reduce(live,{type:'CANCEL_EVENT',role:'control',value:emergency.id});assert.equal(objectives(live,'B').find(o=>o.id===emergency.id)?.status,'cancelled');
});
test('TAB belongs to the gameplay/journal surface; typing, modified shortcuts and ordinary menu focus are untouched',()=>{
 const game={playing:true,typing:false,modified:false,overlay:null,gameSurface:true,journalSurface:false};assert.equal(journalTabIntent(game),'open');assert.equal(journalTabIntent({...game,overlay:'journal',journalSurface:true}),'close');for(const override of [{typing:true},{playing:false},{modified:true},{overlay:'settings'},{gameSurface:false},{overlay:'journal',journalSurface:false}])assert.equal(journalTabIntent({...game,...override}),null);
});

test('journal instructions distinguish cooperative power controls and carried corruption from solo reset channels',()=>{
 let s=prepared(defaultConfig);for(let i=0;i<12;i++)s=reduce(s,{type:'FRAME',value:.25});
 s=reduce(s,{type:'INJECT',role:'control',value:{kind:'emergency',eventKind:'overload',target:'A',severity:1,duration:120,scope:'both',blocking:true}});
 const power=objectives(s,'A').find(o=>o.category==='emergency')!;assert.match(power.instructions,/approval/);assert.match(power.instructions,/12 active seconds/);assert.doesNotMatch(power.resources,/extra reset/);
 s.emergencies[0].scope='either';const solo=objectives(s,'A').find(o=>o.category==='emergency')!;assert.match(solo.instructions,/reset channels/);assert.match(solo.resources,/extra reset/);
 s.emergencies[0].scope='both';s.emergencies[0].kind='corruption';s.emergencies[0].destination=center('comms');s.emergencies[0].carrier='A';const transfer=objectives(s,'B').find(o=>o.category==='emergency')!;assert.equal(transfer.room,'Rotom Relay Station');assert.match(transfer.partner,/Both trainers respond at Rotom Relay Station/);assert.match(transfer.instructions,/12 active seconds/);
});
import {floors,colliders,wallDistanceSquared,WORLD} from './world';
test('collision broad phase agrees with the complete canonical geometry, including gate states',()=>{for(const state of [{},{tasks:[{unlock:'access',complete:false}]}])for(const radius of [0,11,18,40])for(let y=13;y<WORLD.h;y+=37)for(let x=17;x<WORLD.w;x+=37){const p={x,y},floor=floors.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h),wall=radius>0&&wallSegments.some(w=>wallDistanceSquared(p,w)<radius*radius-1e-8),equipment=colliders.some(c=>colliderIntersects(c,p,radius)),gate=doors(state).some(d=>d.locked&&colliderIntersects({...d,shape:'box',roomId:'door'},p,radius));assert.equal(walkable(p,state,null,false,radius),floor&&!wall&&!equipment&&!gate,JSON.stringify({p,radius}));}});
