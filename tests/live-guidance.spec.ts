import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {trialFixture,openTrialTask,solveTrialTask} from './helpers';
test('prescription updates after real task completion even while forecast is unavailable',async({browser})=>{
 const f=await trialFixture(browser),[a]=f.pages;mkdirSync('.qa/live-guidance',{recursive:true});
 try{
   const coolant=f.room.state.tasks.find(t=>t.mode==='coolant')!,signal=f.room.state.tasks.find(t=>t.mode==='signal')!;
   await f.stage('A',coolant.position);await f.stage('B',signal.position);
   const field=a.getByLabel('Field Analyst',{exact:true}),next=field.locator('.analyst-glance p').filter({hasText:'PRESCRIPTIVE / DO NEXT'});
   await expect(next).toContainText('Complete Coolant Control');
   await expect(field).toContainText('Estimated joint extraction in');
   await expect(field).not.toContainText('100% sampled extraction');
   await a.route('**/field-analysis',route=>route.abort());
   await openTrialTask(a,f.room,coolant.id);await solveTrialTask(a,f.room,coolant.id,'A');
   await expect.poll(()=>f.room.state.tasks.find(t=>t.id===coolant.id)!.complete).toBe(true);
   await a.getByRole('button',{name:'Return to facility',exact:true}).click();
   await expect(next).not.toContainText('Complete Coolant Control');await expect(next).toContainText(/Complete|Prepare|Retrieve/);
   await a.screenshot({path:'.qa/live-guidance/after-task.png'});
   await a.unroute('**/field-analysis');await expect(field).toContainText('Estimated joint extraction in',{timeout:15000});
   expect(f.errors).toEqual([]);writeFileSync('reports/live-guidance-qa.json',JSON.stringify({afterTask:await next.innerText(),errors:f.errors,checks:['Actual coolant submission completes task','Current-state prescription visible during failed API request','Completed task disappears from prescription','Forecast automatically retries and returns ETA','Sample success rate not presented as guaranteed extraction']},null,2));
 }finally{await f.close();}
});
