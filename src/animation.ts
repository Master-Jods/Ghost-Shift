import type {MotionState, Player} from './engine';
export const TRAINER_STATES=['idle','run','interact','reaction','victory'] as const;
export const POKEMON_STATES=['idle','run','assist','guard','attack','hit','recover','contain'] as const;
export type PokemonAnimation=typeof POKEMON_STATES[number];
export const directionRow=(yaw:number)=>{const x=Math.cos(yaw),y=Math.sin(yaw);return Math.abs(x)>Math.abs(y)?x>0?1:3:y>0?2:0;};
export function animationState(p:Player,time:number,speed:number,victory=false):MotionState{
 if(victory||p.exit)return 'victory';
 if(p.motion&&time>=p.motion.at&&time<p.motion.until)return p.motion.state;
 if(p.team[p.selected]?.state==='Recovering')return 'recover';
 if(p.assigned)return 'assist';
 return speed>3?'run':'idle';
}
export function trainerFrame(state:MotionState,time:number,travel:number,started=0){
 const name=state==='run'?'run':state==='victory'?'victory':['reaction','hit'].includes(state)?'reaction':['interact','assist','attack','guard','contain'].includes(state)?'interact':'idle';
 const frame=name==='run'?Math.floor(travel/8)%6:Math.floor(Math.max(0,time-started)*(name==='idle'?3:8))%6;
 return {column:TRAINER_STATES.indexOf(name)*6+frame,frame,state:name};
}
export function pokemonPose(state:MotionState,age:number,travel:number,reduced=false){
 const t=Math.max(0,Math.min(1,age/.85)),pulse=Math.sin(t*Math.PI),step=Math.sin(travel*.19);
 // No idle vertical drift: feet stay on the ground. Actions anticipate, contact, recover.
 return {x:state==='attack'?(t<.22?-t*28:Math.sin((t-.22)/.78*Math.PI)*19):0,
  squash:state==='recover'?.78:state==='guard'?.9:state==='attack'?1-pulse*.12:state==='run'&&!reduced?1-Math.abs(step)*.045:1,
  lean:state==='hit'?-pulse*.22:state==='assist'&&!reduced?Math.sin(age*12)*.07:state==='run'&&!reduced?step*.055:0,
  effect:state==='guard'?'shield':state==='attack'?'attack':state==='contain'?'contain':state==='recover'?'rest':state==='assist'?'assist':null,
  intensity:['guard','recover','assist'].includes(state)?.55:pulse};
}
export function attackColor(types:readonly string[]=[]){const colors:Record<string,string>={fire:'#ff994f',water:'#70cbff',grass:'#a4e685',electric:'#ffe27b',ghost:'#bd8df1',poison:'#d591ed',ice:'#bef4ff',psychic:'#ff9dc2',dark:'#ad9da8',fighting:'#e7aa83',steel:'#a6d1d8'};return colors[types[0]]||'#eee2be';}
