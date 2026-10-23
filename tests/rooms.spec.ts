import {steeringKeys} from './helpers';
import {BRIEFING_VERSION} from '../src/engine';
import {acknowledgeBriefing} from './helpers';
import {MAP_SIGNATURE} from '../src/world';
﻿import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {WebSocket} from 'ws';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app';
import {PROTOCOL_VERSION} from '../src/protocol';
import {rooms,roomEquipment,controlPoint,center,pathDirection,distance,roomAt,type Vec} from '../src/world';
let app:ReturnType<typeof createApp>,base:string;
test.beforeAll(async()=>{app=createApp({dbPath:':memory:',staticDir:'dist'});base='http://127.0.0.1:'+await app.listen(0,'127.0.0.1');});
test.afterAll(async()=>app.close());
test('third-person inspection walks all sixteen rooms and checks clear standing and minimap alignment',async({browser})=>{
 test.setTimeout(300000);const phase=process.env.ROOM_AUDIT_PHASE||'after',folder='.qa/room-audit-'+phase;mkdirSync(folder,{recursive:true});
 const room=app.createRoom(null),joined=app.joinRoom(room,'B','Room audit partner'),ws=new WebSocket(base.replace('http','ws')+'/ws');await new Promise<void>(r=>ws.once('open',r));ws.send(JSON.stringify({type:'auth',mapSignature:MAP_SIGNATURE,protocol:PROTOCOL_VERSION,role:'B',sessionId:room.state.id,credential:joined.credential}));
 let seq=1;const command=(role:'B'|'control',type:string,value?:unknown)=>app.command(room,{id:role==='B'?joined.participantId:'audit-op',role,sessionId:room.state.id},{id:randomUUID(),seq:seq++,type,value});
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors:string[]=[],visited:any[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{await page.goto(base+'/play?role=A&code='+room.state.code);await page.getByRole('button',{name:'JOIN SERVER SESSION',exact:true}).click();for(const id of [1,4,7]){await page.getByRole('textbox',{name:'Search Pokémon by name or ID'}).fill(String(id));await page.locator('.catalog-grid').getByRole('button',{name:'Select',exact:true}).click();}await page.getByRole('button',{name:'Finalize three companions'}).click();await page.getByRole('button',{name:'Read field briefing',exact:true}).click();await acknowledgeBriefing(page);expect(command('B','TEAM',[1,4,7]).ok).toBe(true);expect(command('B','ACK_BRIEFING',BRIEFING_VERSION).ok).toBe(true);expect(command('control','START').ok).toBe(true);await expect.poll(()=>room.state.phase).toBe('playing');await expect(page.locator('.third-person')).toHaveAttribute('data-renderer','webgl');
 const walk=async(target:Vec)=>{let held:string[]=[];const until=Date.now()+35000;while(Date.now()<until&&distance(room.state.players.A.position,target)>28){const p=room.state.players.A,v=pathDirection(p.position,target,room.state),f=v.x*Math.cos(p.yaw)+v.y*Math.sin(p.yaw),s=-v.x*Math.sin(p.yaw)+v.y*Math.cos(p.yaw),needed=steeringKeys(p,target,room.state);for(const k of held)if(!needed.includes(k))await page.keyboard.up(k);for(const k of needed)if(!held.includes(k))await page.keyboard.down(k);held=needed;await page.waitForTimeout(75);}for(const k of held)await page.keyboard.up(k);await page.waitForTimeout(180);expect(distance(room.state.players.A.position,target),JSON.stringify({target,player:room.state.players.A.position,input:room.state.players.A.input,yaw:room.state.players.A.yaw,phase:room.state.phase,paused:room.state.paused,elapsed:room.state.elapsed,visited:visited.map(v=>v.room)})).toBeLessThan(45);};
 const face=async(_angle:number)=>{await page.locator('.third-person').focus();};
 // Spatial circuit keeps the audit inside the normal active deadline, with no teleport or simulation-speed changes.
 const order=['arrival','hub','containment','cooling','east','emergency','comms','storage','archive','medical','security','reactor','west','workshop','electrical','exit'];
 for(const id of order){const r=rooms.find(v=>v.id===id)!;await walk(center(id));expect(roomAt(room.state.players.A.position)).toBe(id);await face(-Math.PI/2);await page.screenshot({path:folder+'/'+id+'-north.png'});await face(0);await page.screenshot({path:folder+'/'+id+'-east.png'});if(phase!=='before'){const eq=roomEquipment.find(e=>e.roomId===id)!;await face(Math.atan2(eq.anchor.y-room.state.players.A.position.y,eq.anchor.x-room.state.players.A.position.x));await page.screenshot({path:folder+'/'+id+'-equipment.png'});await walk(controlPoint(id));}const marker=page.locator('[data-map-player="A"]').first();expect(Math.abs(Number(await marker.getAttribute('data-world-x'))-room.state.players.A.position.x)).toBeLessThan(15);visited.push({room:id,position:{...room.state.players.A.position},follower:{...room.state.players.A.follower},elapsed:room.state.elapsed});}
 expect(errors).toEqual([]);expect(visited).toHaveLength(16);writeFileSync(folder+'/audit.json',JSON.stringify({phase,renderer:'webgl',visited,errors},null,2));
 }finally{ws.terminate();await context.close();}
});
