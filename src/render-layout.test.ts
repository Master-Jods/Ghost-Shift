import {traversableContacts} from './layoutAudit';
import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {buildFacility} from './facility3d';import {roomPortals,wallSegments,wallBounds} from './world';
test('actual rendered meshes leave every opening clear at trainer, sign and chase-camera heights',()=>{
 const noop=()=>{},ctx=new Proxy({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop:noop})},{get:(target,key)=>key in target?(target as any)[key]:noop,set:(target,key,value)=>{(target as any)[key]=value;return true;}}),previous=(globalThis as any).document;
 (globalThis as any).document={createElement:()=>({width:512,height:512,getContext:()=>ctx})};
 const scene=new T.Scene();let facility:ReturnType<typeof buildFacility>|undefined;
 try{facility=buildFacility(scene,false);scene.updateMatrixWorld(true);assert.equal(facility.structure.walls.length,wallSegments.length);assert.equal(facility.structure.decorativeDoorFrames,0);assert.deepEqual(facility.structure.walls,wallSegments.map(w=>({...wallBounds(w),height:108})));
  for(const portal of roomPortals)for(const u of [-12,0,12])for(const height of [40,70,87,103]){const middle=new T.Vector3(portal.start.x+portal.tangent.x*(portal.length/2+u),height,portal.start.y+portal.tangent.y*(portal.length/2+u)),direction=new T.Vector3(portal.normal.x,0,portal.normal.y),a=middle.clone().addScaledVector(direction,24),ray=new T.Raycaster(a,direction.negate(),.01,48),hits=ray.intersectObjects(scene.children,true);assert.equal(hits.length,0,portal.roomId+' actual mesh blocks opening at '+height+' / offset '+u);}
  for(const lane of traversableContacts())for(const height of [40,70,87,103]){const a=new T.Vector3(lane.a.x,height,lane.a.y),direction=new T.Vector3(lane.b.x-lane.a.x,0,lane.b.y-lane.a.y).normalize(),ray=new T.Raycaster(a,direction,.01,28);assert.equal(ray.intersectObjects(scene.children,true).length,0,lane.edge.roomId+' corner contact blocked');}
 }finally{facility?.dispose();(globalThis as any).document=previous;}
});
