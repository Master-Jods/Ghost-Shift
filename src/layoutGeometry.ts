/** Exact planar geometry derived from the single room/corridor rectangle inventory. */
export type Vec={x:number;y:number};
export type Rect=Vec&{w:number;h:number};
export type RoomEdge={roomId:string;side:'north'|'south'|'east'|'west';start:Vec;normal:Vec;tangent:Vec;length:number};
export type WallSegment={x:number;z:number;length:number;axis:'x'|'z';normal:number};
const sorted=(values:number[])=>[...new Set(values)].sort((a,b)=>a-b);
export function deriveLayout(rooms:(Rect&{id:string})[],corridors:Rect[]){
 const floors=[...rooms,...corridors],xs=sorted(floors.flatMap(r=>[r.x,r.x+r.w])),ys=sorted(floors.flatMap(r=>[r.y,r.y+r.h]));
 const floorHit=(p:Vec)=>floors.some(r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
 const walls:WallSegment[]=[];
 for(const [axis,lines,spans] of [['x',ys,xs],['z',xs,ys]] as const)for(const line of lines)for(const normal of [-1,1]){
  let begin:number|undefined;
  for(let i=0;i<spans.length;i++){const start=spans[i],end=spans[i+1],mid=(start+end)/2,negative=axis==='x'?{x:mid,y:line-.01}:{x:line-.01,y:mid},positive=axis==='x'?{x:mid,y:line+.01}:{x:line+.01,y:mid};
   const edge=end!==undefined&&(normal<0?floorHit(positive)&&!floorHit(negative):floorHit(negative)&&!floorHit(positive));
   if(edge&&begin===undefined)begin=start;
   if(!edge&&begin!==undefined){walls.push({x:axis==='x'?begin:line,z:axis==='x'?line:begin,length:start-begin,axis,normal});begin=undefined;}
  }
 }
 // Non-overlapping slabs: each floor/ceiling point is drawn once, including room overlaps and junctions.
 const tiles:Rect[]=[];
 for(let j=0;j<ys.length-1;j++){const y=ys[j],h=ys[j+1]-y;let begin:number|undefined;
  for(let i=0;i<xs.length;i++){const x=xs[i],end=xs[i+1],inside=end!==undefined&&floorHit({x:(x+end)/2,y:y+h/2});
   if(inside&&begin===undefined)begin=x;
   if(!inside&&begin!==undefined){const previous=tiles.find(r=>r.x===begin&&r.w===x-begin!&&r.y+r.h===y);if(previous)previous.h+=h;else tiles.push({x:begin,y,w:x-begin,h});begin=undefined;}
  }
 }
 function edges(open:boolean){const result:RoomEdge[]=[];
  for(const r of rooms)for(const side of ['north','south','west','east'] as const){const horizontal=side==='north'||side==='south',length=horizontal?r.w:r.h,origin={x:side==='east'?r.x+r.w:r.x,y:side==='south'?r.y+r.h:r.y},tangent=horizontal?{x:1,y:0}:{x:0,y:1},normal={x:side==='west'?1:side==='east'?-1:0,y:side==='north'?1:side==='south'?-1:0},startAxis=horizontal?origin.x:origin.y;
   const cuts=sorted([0,length,...(horizontal?xs:ys).filter(v=>v>startAxis&&v<startAxis+length).map(v=>v-startAxis)]);let begin:number|undefined;
   for(let i=0;i<cuts.length;i++){const start=cuts[i],end=cuts[i+1],mid=(start+end)/2,match=end!==undefined&&floorHit({x:origin.x+tangent.x*mid-normal.x*.01,y:origin.y+tangent.y*mid-normal.y*.01})===open;
    if(match&&begin===undefined)begin=start;
    if(!match&&begin!==undefined){result.push({roomId:r.id,side,start:{x:origin.x+tangent.x*begin,y:origin.y+tangent.y*begin},tangent,normal,length:start-begin});begin=undefined;}
   }
  }return result;
 }
 const roomWalls=edges(false),connections=edges(true);
 return {floors,tiles,walls,roomWalls,connections,floorHit};
}
/** Wall solids lie outside the walkable floor union; every consumer uses these exact bounds. */
export function wallBounds(w:WallSegment){return w.axis==='x'?{x:w.x,y:w.z+(w.normal<0?-2:0),w:w.length,h:2}:{x:w.x+(w.normal<0?-2:0),y:w.z,w:2,h:w.length};}
