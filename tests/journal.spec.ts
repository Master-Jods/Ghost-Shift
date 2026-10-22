import {BRIEFING_VERSION} from '../src/engine';
import {acknowledgeBriefing} from './helpers';
import {test,expect} from '@playwright/test';
import {createServer,type ViteDevServer} from 'vite';
import react from '@vitejs/plugin-react';
import {WebSocket} from 'ws';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app';
import {MAP_SIGNATURE} from '../src/world';
import {PROTOCOL_VERSION} from '../src/protocol';

test('live journal, TAB ownership, tracked markers and development collision inspection',async({page})=>{
 test.setTimeout(120000);
 const app=createApp({dbPath:':memory:',staticDir:'dist'}),port=await app.listen(0,'127.0.0.1'),backend=`http://127.0.0.1:${port}`;
 let vite:ViteDevServer|undefined,partner:WebSocket|undefined;
 try{
  vite=await createServer({configFile:false,plugins:[react()],server:{host:'127.0.0.1',port:0,proxy:{'/api':backend,'/ws':{target:backend,ws:true}}}});await vite.listen();const base=vite.resolvedUrls!.local[0];
  const room=app.createRoom(null),joined=app.joinRoom(room,'B','Journal partner');partner=new WebSocket(backend.replace('http','ws')+'/ws');await new Promise<void>(resolve=>partner!.once('open',resolve));partner.send(JSON.stringify({type:'auth',mapSignature:MAP_SIGNATURE,protocol:PROTOCOL_VERSION,role:'B',sessionId:room.state.id,credential:joined.credential}));
  let seq=1;const command=(role:'B'|'control',type:string,value?:unknown)=>app.command(room,{id:role==='B'?joined.participantId:'journal-fixture',role,sessionId:room.state.id},{id:randomUUID(),seq:seq++,type,value});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+`play?role=A&code=${room.state.code}`);await page.getByRole('button',{name:'JOIN SERVER SESSION',exact:true}).click();
  for(const id of [25,7,94]){await page.getByRole('textbox',{name:/Search Pok/}).fill(String(id));await page.locator('.catalog-grid').getByRole('button',{name:'Select',exact:true}).click();}
  await page.getByRole('button',{name:'Finalize three companions'}).click();await page.getByRole('button',{name:'Read field briefing',exact:true}).click();await acknowledgeBriefing(page);
  expect(command('B','TEAM',[1,4,7]).ok).toBe(true);expect(command('B','ACK_BRIEFING',BRIEFING_VERSION).ok).toBe(true);expect(command('control','START').ok).toBe(true);
  const canvas=page.locator('.first-person');await expect.poll(()=>room.state.phase).toBe('playing');await expect(canvas).toHaveAttribute('data-renderer','webgl');
  await expect(page.getByLabel('Development collision debug')).toHaveCount(0);await page.keyboard.press('F9');await expect(page.getByLabel('Development collision debug')).toBeVisible();await expect(page.locator('[data-debug-player="A"]')).toHaveAttribute('r','11');await page.screenshot({path:'.qa/collision-debug-v4.png'});await page.keyboard.press('F9');
  const map=page.locator('.player-minimap:not(.expanded)');expect((await map.boundingBox())!.width).toBeGreaterThanOrEqual(435);expect(await map.locator('text').count()).toBe(16);expect(await map.locator('text').first().evaluate(el=>getComputedStyle(el).fontSize)).toBe('10.5px');
  await page.screenshot({path:'.qa/journal-hud-v4.png'});
  await page.getByRole('button',{name:'Collapse task tracker'}).click();await expect(page.locator('.tracker-list')).toHaveCount(0);await page.getByRole('button',{name:'Expand task tracker'}).click();
  await page.getByRole('button',{name:'Mouse look',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.press('Tab');
  const journal=page.getByRole('dialog',{name:'journal overlay'});await expect(journal).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(false);await page.keyboard.up('w');await page.waitForTimeout(300);
  const stopped={...room.state.players.A.position},elapsed=room.state.elapsed,yaw=room.state.players.A.yaw;expect(room.state.players.A.input).toEqual({x:0,y:0});
  expect(command('B','QUICK_SIGNAL','Acknowledged').ok).toBe(true);await page.mouse.move(1000,450);await page.waitForTimeout(1100);expect(room.state.elapsed).toBeGreaterThan(elapsed);expect(room.state.paused).toBe(false);expect(Math.hypot(stopped.x-room.state.players.A.position.x,stopped.y-room.state.players.A.position.y)).toBeLessThan(1);expect(room.state.players.A.yaw).toBe(yaw);await expect(page.locator('.partner-chip')).toContainText('Acknowledged');
  const selected=room.state.tasks.at(-1)!;await journal.getByRole('navigation').getByRole('button').filter({hasText:selected.name}).click();await expect(journal.getByLabel('Task details')).toContainText('Prerequisites');await expect(page.locator('.tracker-row.tracked')).toContainText(selected.name);await expect(map.locator(`[data-objective-marker="${selected.id}"] circle`)).toHaveCount(2);await page.screenshot({path:'.qa/task-journal-v4.png'});
  // Controls retain normal keyboard focus traversal; the dialog surface owns the toggle.
  await journal.getByRole('button',{name:'Currently tracked',exact:true}).focus();await page.keyboard.press('Tab');await expect(journal).toBeVisible();await journal.focus();await page.keyboard.press('Tab');await expect(journal).toBeHidden();
  await page.getByRole('button',{name:'Settings',exact:true}).click();const sensitivity=page.getByLabel('Numeric mouse sensitivity',{exact:true});await sensitivity.focus();await page.keyboard.press('Tab');await expect(page.getByRole('dialog')).toBeVisible();await expect(sensitivity).not.toBeFocused();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Tasks',exact:true}).click();await expect(journal).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Expand map',exact:true}).click();await expect(page.locator('.player-minimap.expanded')).toBeVisible();await page.screenshot({path:'.qa/expanded-map-v4.png'});await page.getByRole('button',{name:'Close overlay',exact:true}).click();
  const operator={id:'journal-fixture',role:'control' as const,sessionId:room.state.id},preview=await app.preview(room,operator,{type:'INJECT',value:{kind:'emergency',eventKind:'reactor',target:'A',severity:1,duration:90,scope:'both',blocking:true}});expect(app.command(room,operator,{id:randomUUID(),seq:seq++,type:'CONFIRM_PREVIEW',previewId:preview.id}).ok).toBe(true);const emergency=room.state.emergencies.at(-1)!;await expect(page.locator('.tracker-emergencies')).toContainText(emergency.name);await page.getByRole('button',{name:'Collapse task tracker'}).click();await expect(page.locator('.tracker-emergencies')).toBeVisible();await expect(page.locator('.tracker-emergencies')).toContainText(emergency.name);await page.getByRole('button',{name:'Expand task tracker'}).click();
  expect(command('control','CANCEL_EVENT',emergency.id).ok).toBe(true);await expect(page.locator('.tracker-emergencies')).toContainText('None active');await page.getByRole('button',{name:'Tasks',exact:true}).click();await journal.getByRole('navigation').getByRole('button').filter({hasText:emergency.name}).click();await expect(journal.getByLabel('Task details')).toContainText('cancelled');
  expect(errors).toEqual([]);
 }finally{partner?.terminate();await vite?.close();await app.close();}
});

