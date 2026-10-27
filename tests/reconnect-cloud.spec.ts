import {test,expect} from '@playwright/test';
import {createCloudApp} from '../server/cloud/app';import {memoryPostgres} from '../server/cloud/testDatabase';
import {BRIEFING_VERSION} from '../src/engine';import {randomUUID} from 'node:crypto';import {WebSocket} from 'ws';
import {MAP_SIGNATURE} from '../src/world';import {PROTOCOL_VERSION} from '../src/protocol';
test('deployed-style connection rotations preserve player ownership and active gameplay',async({browser})=>{
 test.setTimeout(60000);const db=memoryPostgres(),app=createCloudApp({db,staticDir:'dist',bootstrapPassword:'reconnect-test-password',rotationMs:1800}),ctx=await browser.newContext();let partner:WebSocket|undefined,finishing=false;let partnerTimer:ReturnType<typeof setTimeout>|undefined;
 try{
 await app.service.ready;const base='http://127.0.0.1:'+await app.listen(0,'127.0.0.1'),login=await app.service.login('operator','reconnect-test-password'),op={cookie:login.token},room=await app.service.create(login.operator.id);let seq=1;const players=[];
 for(const role of ['A','B'] as const){const p=await app.service.join(room.code,role,{fullName:'Reconnect '+role,block:'QA',groupNumber:'1'});players.push(p);for(const [type,value] of [['TEAM',[1,4,7]],['ACK_BRIEFING',BRIEFING_VERSION]] as const)expect((await app.service.command(room.sessionId,{bearer:p.credential},{id:randomUUID(),seq:seq++,type,value})).ok).toBe(true);p.nextSeq=seq;}
 const authenticatePartner=()=>{partner!.send(JSON.stringify({type:'auth',protocol:PROTOCOL_VERSION,mapSignature:MAP_SIGNATURE,sessionId:room.sessionId,role:'B',credential:players[1].credential}));};
 // Partner reconnects explicitly in this fixture, independently of the browser transport.
 const partnerConnect=()=>{partner=new WebSocket(base.replace('http:','ws:')+'/ws');partner.on('open',authenticatePartner);partner.on('close',()=>{if(!finishing)partnerTimer=setTimeout(partnerConnect,100);});};partnerConnect();
 await ctx.addInitScript(p=>{sessionStorage.setItem('jt-active-player',JSON.stringify(p));localStorage.setItem('gs-presentation',JSON.stringify({_uiVersion:2,audioVersion:3,muted:true,quality:'low',shadows:false}));(window as any).__closes=[];window.addEventListener('ghost-connection-close',(e:any)=>(window as any).__closes.push(e.detail));},players[0]);
 const page=await ctx.newPage();await page.goto(base+'/play/lobby?role=A');await expect.poll(async()=>(await app.service.snapshot(room.sessionId,op)).net.presence.A.connected).toBe(true);
 await expect.poll(async()=>(await app.service.snapshot(room.sessionId,op)).net.presence.B.connected).toBe(true);expect((await app.service.command(room.sessionId,op,{id:randomUUID(),seq:seq++,type:'START'})).ok).toBe(true);
 await expect(page.locator('.third-person')).toBeVisible();await expect.poll(()=>page.evaluate(()=>(window as any).__closes.filter((c:any)=>c.code===1012).length),{timeout:15000}).toBeGreaterThanOrEqual(2);
 await expect(page.locator('.connection-banner')).toHaveCount(0);const snapshot=await app.service.snapshot(room.sessionId,op);expect(snapshot.state.phase).toBe('playing');expect(snapshot.state.paused).toBe(false);expect(snapshot.net.presence.A.connected).toBe(true);
 await page.screenshot({path:'.qa/cloud-reconnect-recovered.png'});finishing=true;
 }finally{finishing=true;clearTimeout(partnerTimer);partner?.removeAllListeners('close');partner?.terminate();await ctx.close();await app.close();}
});
