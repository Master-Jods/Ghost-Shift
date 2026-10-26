import {emergencyLocation,extractionReady,type State,type Task} from './engine.js';
import {pathLength,roomName,roomAt,center} from './world.js';
import {routeComparisons} from './routeAnalysis.js';
type Role='A'|'B';
export type LiveStep={role:Role;text:string;companion:string;targetId?:string;travelSeconds?:number};
const roles:Role[]=['A','B'];
export function taskWork(t:Task){return t.mode==='wiring'?4+t.connections.filter((v,i)=>v!==t.pattern[i]).length*2.5:t.mode==='cooperative'?Math.max(4,8-Object.keys(t.setup).length*2):t.mode==='signal'?9:11.5;}
/** Live, executable next actions. Current canonical paths include closed doors.
 * This greedy joint assignment is fast and bounded; it is not a global optimum.
 */
export function liveGuidance(s:State):LiveStep[]{
 const result=new Map<Role,LiveStep>(),used=new Set<string>();
 const cost=(r:Role,p:{x:number;y:number})=>pathLength(s.players[r].position,p,s)/185;
 const assign=(r:Role,id:string,name:string,target:{x:number;y:number},suffix='')=>{
   const seconds=cost(r,target),routes=routeComparisons(s,r,{position:target,name}),current=routes.options.find(o=>o.name==='Current doors / preserve key'),best=routes.best;
   const detour=current?'Use the current open corridors.':'The current route is blocked; coordinate a door release first.';
   const shortcut=best&&best.name!=='Current doors / preserve key'&&(!current||best.totalSeconds+3<current.totalSeconds)?` First: ${best.name}. ${best.effect} Then continue to the objective.`:'';
   const where=roomName(roomAt(target));
   result.set(r,{role:r,targetId:id,travelSeconds:Number.isFinite(seconds)?Math.ceil(seconds):undefined,text:`${name} at ${where}. ${Number.isFinite(seconds)?`About ${Math.ceil(seconds)}s walking via current doors. `:''}${shortcut||detour} ${suffix}`.trim(),companion:'Current-state route guidance; tasks remain manual. '+(s.players[r].encounterId&&s.players[r].encounterId!==id?'Leave the current battle before travelling.':'Keep an available companion with you.')});
 };
 if(s.phase==='failed'||s.phase==='success')return roles.map(role=>({role,text:s.phase==='success'?'Joint extraction complete.':'Session ended. Review the missed objective.',companion:''}));
 for(const e of s.emergencies.filter(e=>e.status==='active').sort((a,b)=>a.expiresAt-b.expiresAt)){
   let allowed=e.scope==='both'?roles:e.scope==='A'||e.scope==='B'?[e.scope] as Role[]:roles;
   if(e.carrier)allowed=[e.carrier];
   const responders=e.scope==='both'?allowed:allowed.slice().sort((a,b)=>Number(result.has(a))-Number(result.has(b))||cost(a,emergencyLocation(e,a))-cost(b,emergencyLocation(e,b))).slice(0,1);
   for(const r of responders)if(!result.has(r))assign(r,e.id,'Resolve '+e.name,emergencyLocation(e,r),`${Math.max(0,Math.ceil(e.expiresAt-s.elapsed))}s left; missing this deadline ends the session. ${e.kind==='overload'&&!e.allocated?'Propose a reset plan and get partner approval.':e.kind==='corruption'&&!e.carrier?'Retrieve the fragment, then carry it to the marked upload terminal.':e.scope==='both'?'Use separate A/B controls within 12 seconds.':'Follow the target channel and complete each remaining reset.'}`);
 }
 for(const t of s.threats.filter(t=>t.status==='active'&&t.blocking)){
   const r=roles.filter(r=>!result.has(r)).sort((a,b)=>cost(a,t.position)-cost(b,t.position))[0];if(r)assign(r,t.instanceId,'Win the blocking battle against '+t.name,t.position,'Use legal moves and a healthy party; the linked gate remains closed until this encounter is cleared.');
 }
 for(const r of roles)if(!result.has(r)&&s.players[r].encounterId){const t=s.threats.find(t=>t.instanceId===s.players[r].encounterId);result.set(r,{role:r,targetId:t?.instanceId,text:'Choose your next legal battle move, or retreat to continue research. Optional battles do not replace normal tasks.',companion:'Use type effectiveness and switch if your active Pokemon faints.'});}
 const solo=s.tasks.filter(t=>!t.complete&&t.mode!=='cooperative');
 while(roles.some(r=>!result.has(r))){
   const pairs=roles.filter(r=>!result.has(r)).flatMap(r=>solo.filter(t=>!used.has(t.id)&&(!t.carrier||t.carrier===r)).map(t=>{const target=t.mode==='transfer'&&t.carrier?t.destination!:t.position;return{r,t,target,score:cost(r,target)+taskWork(t)};})).filter(v=>Number.isFinite(v.score)).sort((a,b)=>a.score-b.score||a.t.id.localeCompare(b.t.id));
   const next=pairs[0];if(!next)break;used.add(next.t.id);
   assign(next.r,next.t.id,next.t.mode==='transfer'&&!next.t.carrier?'Retrieve module for '+next.t.name:'Complete '+next.t.name,next.target,next.t.mode==='transfer'&&!next.t.carrier?'Then carry it to '+roomName(roomAt(next.t.destination!))+' and verify the upload.':'');
 }
 for(const r of roles)if(!result.has(r)){
   const coop=s.tasks.find(t=>!t.complete&&t.mode==='cooperative');
   if(coop)assign(r,coop.id,solo.length?'Prepare your Dual Stabilization control':'Complete Dual Stabilization',r==='B'?coop.secondPosition!:coop.position,solo.length?'Your partner finishes the remaining solo work; meet here afterward.':'Validate local setup, then both activate within 12 seconds.');
   else if(extractionReady(s))assign(r,'extraction','Reach joint extraction',center('exit'),'Both trainers must arrive.');
   else result.set(r,{role:r,text:'Finish the remaining partner response before extraction. Check the marked incident and closed-gate requirements.',companion:'Coordinate with your partner.'});
 }
 return roles.map(r=>result.get(r)!);
}
