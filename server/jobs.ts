import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import type {State} from '../src/engine';
export type Job={id:string;status:'queued'|'running'|'complete'|'failed'|'cancelled';progress:number|null;context?:{sessionId:string;stateVersion:number;elapsed:number;materialVersion?:string;fieldKey?:string};result?:any;error?:string;createdAt:number;owner:string;background?:boolean;forecast?:{sessionId:string;stateVersion:number;elapsed:number;features:unknown};cancel:()=>void};
export class Jobs{
 jobs=new Map<string,Job>();private running=0;private backgroundRunning=0;private queue:{run:()=>void;background:boolean}[]=[];
 private pump(){while(this.running<2){const i=this.queue.findIndex(j=>!j.background||this.backgroundRunning<1);if(i<0)return;const [next]=this.queue.splice(i,1);next.run();}}private cache=new Map<string,any>();
 submit(owner:string,kind:string,state:State|null,options:Record<string,unknown>={}):Job{
  for(const [id,old] of this.jobs)if(!['queued','running'].includes(old.status)&&Date.now()-old.createdAt>300000)this.jobs.delete(id);
  // Reloaded clients cannot clean up their old background jobs. Keep only the latest adviser snapshot
  // per owner, and free that owner's background slot before interactive previews.
  for(const old of [...this.jobs.values()])if(old.owner===owner&&old.background&&['queued','running'].includes(old.status))old.cancel();
  const pending=[...this.jobs.values()].filter(j=>['queued','running'].includes(j.status));
  if(pending.length>=18||pending.filter(j=>j.owner===owner).length>=3)throw Error('Analytical workers are busy. Wait for a current job or cancel it before retrying.');
  const background=options.background===true;const cacheKey=JSON.stringify({kind,state,options});const job:Job={id:randomUUID(),status:'queued',progress:0,createdAt:Date.now(),owner,background,cancel:()=>{if(job.status==='queued'){job.status='cancelled';job.progress=0;}}};this.jobs.set(job.id,job);
  const run=()=>{if(job.status==='cancelled'){this.pump();return;}const cached=this.cache.get(cacheKey);if(cached){job.status='complete';job.result=cached;job.progress=100;this.pump();return;}this.running++;if(background)this.backgroundRunning++;job.status='running';job.progress=null;const worker=new Worker(new URL('./analytics-worker.mjs',import.meta.url),{execArgv:[],workerData:{kind,state,options}});const timer=setTimeout(()=>{job.error='Computation budget exceeded. Reduce samples and retry.';job.status='failed';worker.terminate();finish();},kind==='evaluation'?180000:45000);let finished=false;const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);void worker.terminate();this.running--;if(background)this.backgroundRunning--;this.pump();};job.cancel=()=>{if(job.status!=='running')return;job.status='cancelled';worker.terminate();finish();};worker.on('message',message=>{if(finished)return;if(job.status!=='cancelled'){job.status=message.ok?'complete':'failed';job.result=message.result;job.error=message.error;job.progress=100;if(message.ok){if(this.cache.size>60)this.cache.delete(this.cache.keys().next().value!);this.cache.set(cacheKey,message.result);}}finish();});worker.on('error',e=>{if(finished)return;job.status='failed';job.error=e.message;finish();});};
  if(this.running<2&&(!background||this.backgroundRunning<1))run();else {const entry={run,background};if(background)this.queue.push(entry);else this.queue.unshift(entry);}return job;
 }
 async wait(job:Job){while(['queued','running'].includes(job.status))await new Promise(r=>setTimeout(r,25));if(job.status!=='complete')throw Error(job.error||'Job cancelled.');return job.result;}
 close(){this.queue=[];for(const job of this.jobs.values())if(['queued','running'].includes(job.status))job.cancel();}
}
