import {useEffect,useState} from 'react';
import {WORLD,PLAYER_RADIUS,MAP_SIGNATURE,wallSegments,colliders,doors} from './world';
import type {State} from './engine';
/** Development-only F9 inspection. Not rendered or toggleable by production builds. */
export default function CollisionDebug({state,role}:{state:State;role:'A'|'B'}){
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{if(!import.meta.env.DEV)return;const key=(e:KeyboardEvent)=>{if(e.code==='F9'&&!(e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]')){e.preventDefault();setEnabled(v=>!v);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 if(!import.meta.env.DEV||!enabled)return null;const p=state.players[role];
 return <aside className="collision-debug" aria-label="Development collision debug"><header>F9 · EXACT COLLISION / RADIUS {PLAYER_RADIUS}</header><code>{MAP_SIGNATURE}</code><svg viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}>
 {wallSegments.map((w,i)=><line key={i} x1={w.x} y1={w.z} x2={w.x+(w.axis==='x'?w.length:0)} y2={w.z+(w.axis==='z'?w.length:0)} stroke="#fff" strokeWidth="3"/>)}
 {colliders.map(c=>c.shape==='circle'?<circle key={c.id} cx={c.x} cy={c.y} r={c.r} fill="#ec717966" stroke="#ff9ba6"/>:<rect key={c.id} x={c.x} y={c.y} width={c.w} height={c.h} fill="#ec717966" stroke="#ff9ba6"/>)}
 {doors(state).map(d=><rect key={d.id} x={d.x} y={d.y} width={d.w} height={d.h} fill={d.locked?'#ffc14b':'#4ada9b'} opacity={d.locked?1:.3}/>)}
 <circle data-debug-player={role} cx={p.position.x} cy={p.position.y} r={PLAYER_RADIUS} fill="#f4ff93" stroke="#18272c"/>
 </svg><p>White: walls · red: solid props · amber: closed gate · yellow: player collision circle. No follower colliders.</p></aside>;
}
