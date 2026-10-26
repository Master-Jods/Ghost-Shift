import {layoutGeometry,walkable} from './world';
/** Read-only audit of all region contacts, including short corner overlaps hidden by the old frame filter. */
export function traversableContacts(){return layoutGeometry.connections.flatMap((edge,index)=>{
 const candidates=[];
 for(let u=1;u<edge.length;u++){const middle={x:edge.start.x+edge.tangent.x*u,y:edge.start.y+edge.tangent.y*u},a={x:middle.x+edge.normal.x*14,y:middle.y+edge.normal.y*14},b={x:middle.x-edge.normal.x*14,y:middle.y-edge.normal.y*14};
  if(walkable(a,undefined,null,false,12)&&walkable(b,undefined,null,false,12)&&walkable(middle,undefined,null,false,12))candidates.push({u,middle,a,b});
 }
 candidates.sort((a,b)=>Math.abs(a.u-edge.length/2)-Math.abs(b.u-edge.length/2));return candidates.length?[{index,edge,...candidates[0]}]:[];
});}
