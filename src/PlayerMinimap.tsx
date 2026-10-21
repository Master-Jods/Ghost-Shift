import {useEffect,useRef,useState} from 'react';
import {WORLD,MAP_VERSION,rooms,corridors,colliders,wallSegments,doors,center,roomName,roomAt,type Vec} from './world';
import type {State} from './engine';
import type {PresentationSettings} from './presentation';
import {objectives} from './objectives';
export function mapProjection(width:number,height:number,heading:number){const extentX=Math.abs(Math.cos(heading))*WORLD.w+Math.abs(Math.sin(heading))*WORLD.h,extentY=Math.abs(Math.sin(heading))*WORLD.w+Math.abs(Math.cos(heading))*WORLD.h,scale=Math.min((width-22)/extentX,(height-22)/extentY);return {scale,point:(p:Vec)=>{const x=p.x-WORLD.w/2,y=p.y-WORLD.h/2;return {x:width/2+(x*Math.cos(heading)-y*Math.sin(heading))*scale,y:height/2+(x*Math.sin(heading)+y*Math.cos(heading))*scale};}};}
const shortNames:Record<string,string[]>={arrival:['Arrival'],hub:['Central','Hub'],electrical:['Electrical'],comms:['Comms'],medical:['Medical','Bay'],reactor:['Reactor'],cooling:['Cooling'],containment:['Contain.','Lab'],archive:['Archive'],security:['Security'],storage:['Storage'],workshop:['Workshop'],west:['West svc'],emergency:['Emergency','Control'],east:['East svc'],exit:['Extraction']};
export default function PlayerMinimap({state,role,yaw,settings,expanded=false,tracked=null,onExpand}:{state:State;role:'A'|'B';yaw:number;settings:PresentationSettings;expanded?:boolean;tracked?:string|null;onExpand?:()=>void}){
 const ref=useRef<HTMLElement>(null),[width,setWidth]=useState(settings.minimapSize),p=state.players[role],partner=state.players[role==='A'?'B':'A'];
 useEffect(()=>{const el=ref.current;if(!el)return;const resize=()=>setWidth(el.clientWidth);resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[]);
 const h=Math.max(140,width*.78),heading=settings.minimapOrientation==='heading'&&!expanded?-(yaw+Math.PI/2):0,{scale,point}=mapProjection(width,h,heading),items=objectives(state,role),jam=state.emergencies.some(e=>e.status==='active'&&e.kind==='comms'&&['either','both',role].includes(e.scope));
 const trainer=point(p.position),exit=point(center('exit'));
 const occupied:{x:number;y:number;w:number;h:number}[]=[];
 const labels=[...rooms].sort((a,b)=>Number(b.id===p.room)-Number(a.id===p.room)).flatMap(r=>{
  const location=point({x:r.x+r.w/2,y:r.y+r.h*.28}),lines=width<330?[r.id==='containment'?'Lab':r.id==='emergency'?'Control':r.id==='electrical'?'Elec.':r.id==='workshop'?'Shop':shortNames[r.id][0]]:shortNames[r.id],font=expanded?12:10.5,bw=Math.max(...lines.map(v=>v.length))*font*.59+7,bh=lines.length*(font+1)+4;
  for(const dy of [0,12,-10]){const b={x:location.x-bw/2,y:location.y+dy-bh/2,w:bw,h:bh};if(b.x<2||b.x+b.w>width-2||b.y<2||b.y+b.h>h-2||occupied.some(o=>b.x<o.x+o.w+2&&b.x+b.w+2>o.x&&b.y<o.y+o.h+2&&b.y+b.h+2>o.y))continue;occupied.push(b);return [{r,b,lines,font}];}return [];
 });
 return <aside ref={ref} className={'player-minimap '+(expanded?'expanded':'')} style={expanded?undefined:{width:settings.minimapSize}} aria-label="Player facility minimap" data-map-version={MAP_VERSION}><header><div><b>{roomName(p.room)}</b><span>{heading?'HEADING ↑':'NORTH ↑'}</span></div>{!expanded&&onExpand&&<button aria-label="Expand map" onClick={onExpand}>Map ↗</button>}</header>
 <svg viewBox={`0 0 ${width} ${h}`} role="img" aria-label="Live room geometry, room names and known task locations">
 <g transform={`translate(${width/2} ${h/2}) scale(${scale}) rotate(${heading*180/Math.PI}) translate(${-WORLD.w/2} ${-WORLD.h/2})`}>
 {corridors.map((r,i)=><rect key={'c'+i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#304957"/>)}
 {rooms.map(r=><rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.id===p.room?'#5f7864':'#455b5d'} stroke={r.id===p.room?'#ffe49a':'#8ba39d'} strokeWidth={r.id===p.room?7:2}/>)}
 {wallSegments.map((w,i)=><line key={'w'+i} x1={w.x} y1={w.z} x2={w.x+(w.axis==='x'?w.length:0)} y2={w.z+(w.axis==='z'?w.length:0)} stroke="#d2dbce" strokeWidth="4"/>)}
 {colliders.map(c=>c.shape==='circle'?<circle key={c.id} cx={c.x} cy={c.y} r={c.r} fill="#162c31"/>:<rect key={c.id} x={c.x} y={c.y} width={c.w} height={c.h} fill="#162c31"/>)}
 {doors(state).map(d=><rect key={d.id} x={d.x} y={d.y} width={d.w} height={d.h} fill={d.locked?'#ff936a':'#7debaf'} stroke="#182b30" strokeWidth="3"/>)}
 </g>
 {labels.map(({r,b,lines,font})=><g key={r.id} aria-label={r.name}><title>{r.name}</title><rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill={r.id===p.room?'#203b25ee':'#10282ce8'}/><text x={b.x+b.w/2} y={b.y+font+1} textAnchor="middle" fontSize={font} fontFamily="monospace" fontWeight={r.id===p.room?'bold':'normal'} fill="#f3f0d9">{lines.map((line,i)=><tspan key={i} x={b.x+b.w/2} dy={i===0?0:font+1}>{line}</tspan>)}</text></g>)}
 {items.filter(o=>o.category==='normal'||!o.complete||o.id===tracked).map(o=>{const location=point(o.position),active=o.id===tracked;return <g key={o.id} data-objective-marker={o.id} data-world-x={o.position.x} data-world-y={o.position.y} data-complete={o.complete}><title>{o.name} / {o.room} / {o.status}</title>{active&&<circle cx={location.x} cy={location.y} r="10" fill="none" stroke="#fff8c9" strokeWidth="2"/>}<circle cx={location.x} cy={location.y} r={active?5:3.5} fill={o.complete?'#92d6b1':o.category==='emergency'?'#f68e70':'#f5d67f'} stroke="#132b32" strokeWidth="1.5"/></g>;})}
 <rect x={exit.x-4} y={exit.y-4} width="8" height="8" fill="#96e3b5" stroke="#123728"/>
 {!jam&&partner.position.x>=0&&(()=>{const q=point(partner.position);return <circle cx={q.x} cy={q.y} r="4.5" fill="#a6c2ff" stroke="#172941"/>;})()}
 <g data-map-player={role} data-world-x={p.position.x} data-world-y={p.position.y} transform={`translate(${trainer.x} ${trainer.y}) rotate(${yaw*180/Math.PI+90+heading*180/Math.PI})`}><circle r="8" fill="#10262e"/><path d="M0 -9L6 7L0 4L-6 7Z" fill="#fffad8" stroke="#edc467" strokeWidth="1.4"/></g>
 </svg><footer><span>● Task</span><span className="legend-emergency">● Emergency</span><span>□ Exit</span><span>▰ Locked door</span>{jam&&<span>Radio unavailable</span>}</footer></aside>;
}
