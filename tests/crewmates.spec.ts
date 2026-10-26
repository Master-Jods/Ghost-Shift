import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {trialFixture} from './helpers';
import {center} from '../src/world';
test('two 3D crewmates, distance-driven walking, recorded footsteps and camera switching',async({browser})=>{
 mkdirSync('.qa/crewmates',{recursive:true});const f=await trialFixture(browser),[a,b]=f.pages;
 const stats=async()=>JSON.parse(await a.locator('html').getAttribute('data-game-audio')||'{}');
 try{
  const spawn=center('arrival');await f.stage('A',spawn);await f.stage('B',{x:spawn.x,y:spawn.y-95});f.room.state.players.B.yaw=Math.PI/2;f.room.state.revision++;
  const c=a.locator('.third-person');await expect(c).toHaveAttribute('data-avatar-a','crewmate');await expect(c).toHaveAttribute('data-avatar-b','crewmate');await expect(c).toHaveAttribute('data-hands-visible','false');
  await a.evaluate(()=>window.dispatchEvent(new CustomEvent('ghost-audio-unlock',{detail:{...JSON.parse(localStorage.getItem('gs-presentation')||'{}'),muted:false,master:.8,effects:1,music:0,ambience:0}})));
  await expect.poll(async()=>(await stats()).decodedFootsteps).toBe(10);
  const before=(await stats()).footstepsPlayed;
  await c.focus();await a.keyboard.press('9');await expect(c).toHaveAttribute('data-camera','third-person');await a.waitForTimeout(500);
  await a.screenshot({path:'.qa/crewmates/two-crewmates.png'});
  await a.keyboard.down('w');await expect(c).toHaveAttribute('data-trainer-a',/^run:3d:/);await expect.poll(async()=>(await stats()).footstepsPlayed).toBeGreaterThan(before);await a.screenshot({path:'.qa/crewmates/walking.png'});await a.keyboard.up('w');
  await expect(c).toHaveAttribute('data-trainer-a',/^idle:3d:/);await a.waitForTimeout(500);const stopped=(await stats()).footstepsPlayed;await a.waitForTimeout(800);expect((await stats()).footstepsPlayed).toBe(stopped);
  await a.keyboard.press('9');await expect(c).toHaveAttribute('data-camera','first-person');await expect(c).toHaveAttribute('data-hands-visible','false');
  expect(f.errors).toEqual([]);writeFileSync('reports/crewmates-audio-qa.json',JSON.stringify({audio:await stats(),errors:f.errors,checks:['Two crewmate models rendered','Walking pose while keyboard moving','10 decoded recorded footstep variants','Footsteps advance during movement, stop when idle','First/third-person toggle and no hands']},null,2));
 }finally{await f.close();}
});
