import {wallSegments,wallBounds,colliders,roomEquipment,doors,type MapState,type Vec} from './world';
export const CHASE={pivot:40,distance:94,min:56,max:140,pitch:.10,minPitch:-1.05,maxPitch:1.1,radius:4};
export const clampPitch=(p:number)=>Math.max(CHASE.minPitch,Math.min(CHASE.maxPitch,p));
type V3={x:number;y:number;z:number};
/** Swept camera sphere versus canonical wall/gate/equipment bounds, never decorative decals. */
export function cameraClearance(from:V3,to:V3,state?:MapState){
 const boxes=wallSegments.map(w=>{const b=wallBounds(w);return {x:b.x,z:b.y,w:b.w,d:b.h,height:108};});
 for(const c of colliders){const kind=roomEquipment.find(e=>e.roomId===c.roomId)!.kind,height=c.height??(kind==='medical'?27:kind==='reactor'?70:kind==='pods'?61:kind==='supplies'?52:kind==='coolant'?65:64);boxes.push(c.shape==='box'?{x:c.x,z:c.y,w:c.w,d:c.h,height}:{x:c.x-c.r,z:c.y-c.r,w:c.r*2,d:c.r*2,height});}
 for(const d of doors(state))if(d.locked)boxes.push({x:d.x,z:d.y,w:d.w,d:d.h,height:108});
 let fraction=1;const delta={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},r=CHASE.radius;
 for(const b of boxes){let near=0,far=1;for(const [a,lo,hi] of [['x',b.x-r,b.x+b.w+r],['y',-r,b.height+r],['z',b.z-r,b.z+b.d+r]] as const){if(Math.abs(delta[a])<1e-9){if(from[a]<lo||from[a]>hi){near=2;break;}}else{const t1=(lo-from[a])/delta[a],t2=(hi-from[a])/delta[a];near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));}}if(near<=far&&far>=0&&near>=0)fraction=Math.min(fraction,near);}
 return Math.max(0,fraction-.015);
}
export function chasePose(position:Vec,yaw:number,pitch:number,distance:number,previous:number,dt:number,state?:MapState){
 const p=clampPitch(pitch),requested=Math.max(CHASE.min,Math.min(CHASE.max,distance)),pivot={x:position.x,y:CHASE.pivot,z:position.y};
 const offset={x:-Math.cos(yaw)*Math.cos(p)*requested,y:12+Math.sin(p)*requested,z:-Math.sin(yaw)*Math.cos(p)*requested};
 const safe=cameraClearance(pivot,{x:pivot.x+offset.x,y:pivot.y+offset.y,z:pivot.z+offset.z},state)*requested;
 // Inward safety is immediate; outward recovery is eased. Position follow is smoothed separately.
 const actual=safe<previous?safe:previous+(safe-previous)*(1-Math.exp(-5*Math.min(.06,dt))),ratio=actual/requested;
 return {position:{x:pivot.x+offset.x*ratio,y:pivot.y+offset.y*ratio,z:pivot.z+offset.z*ratio},target:{x:pivot.x+Math.cos(yaw)*48,y:CHASE.pivot+1,z:pivot.z+Math.sin(yaw)*48},distance:actual,pitch:p};
}
