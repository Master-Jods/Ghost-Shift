import type {State,Threat,MotionState} from './engine';
/** Cosmetic timing only: never applies damage or advances the reducer. */
export function threatPresentation(s:State,t:Threat):{state:MotionState;age:number;kind:string}{
 if(t.battle){const cue=battleMotion(s,t,'opponent');if(cue)return cue;return {state:t.status==='active'?'idle':'victory',age:t.status==='active'?Math.max(0,s.worldTime-t.activeAt):Math.max(0,s.worldTime-(t.motion?.at||s.worldTime)),kind:'showdown'};}
 if(t.status!=='active')return {state:'victory',age:Math.max(0,t.motion?.state==='victory'?s.worldTime-t.motion.at:s.elapsed-(t.resolvedAt??s.elapsed)),kind:'resolved'};
 if(s.worldTime<t.activeAt)return {state:'idle',age:0,kind:'materializing'};
 if(t.motion&&s.worldTime>=t.motion.at&&s.worldTime<t.motion.until)return {state:t.motion.state,age:s.worldTime-t.motion.at,kind:'confirmed'};
 const engaged=Object.values(s.players).some(p=>p.encounterId===t.instanceId),age=Math.max(0,s.worldTime-t.activeAt),phase=age%7;
 // A visible, non-damaging challenge while engaged. It is not an enemy damage turn.
 if(engaged&&phase<1.25)return {state:'attack',age:phase,kind:'challenge'};
 return {state:'idle',age:engaged?phase:age,kind:'standby'};
}
export function threatFacingTarget(s:State,t:Threat){return (Object.values(s.players).find(p=>p.encounterId===t.instanceId)||s.players[t.target]).follower;}
export function battlePhase(state:MotionState,age:number){if(state==='attack'||state==='contain')return age<.18?'windup':age<.6?'impact':age<3.2?'recover':'ready';return state==='guard'?'guard':state==='hit'?'hit':'ready';}

export function battleMotion(s:State,t:Threat,side:'player'|'opponent'):{state:MotionState;age:number;kind:string}|null{const cue=t.battle?.cues.filter(c=>c.side===side&&s.worldTime>=c.at&&s.worldTime<c.until).sort((a,b)=>b.at-a.at)[0];if(!cue)return null;return {state:cue.kind==='faint'?'victory':cue.kind,age:s.worldTime-cue.at,kind:'showdown'};}
export function playerBattleMotion(s:State,t:Threat){if(!t.battle)return null;return battleMotion(s,t,'player')||{state:'idle' as MotionState,age:0,kind:'showdown'};}
