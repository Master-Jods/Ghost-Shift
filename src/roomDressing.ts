import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {roomEquipment,rooms,themedStations,type Vec} from './world';
/** Original themed storytelling inside existing equipment footprints or on solid walls.
 * No entrances, floor partitions, collision bodies or automatic encounters are generated.
 */
export function buildRoomIdentity(scene:T.Scene,cutaway=false){
 const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],textures:T.Texture[]=[],objects:T.Object3D[]=[],lights:T.PointLight[]=[],batches=new Map<T.Material,T.BufferGeometry[]>();
 const mat=(color:string,metalness=.1)=>{const m=new T.MeshStandardMaterial({color,roughness:.8,metalness});materials.push(m);return m;};
 const steel=mat('#536267',.45),ivory=mat('#c4c4ae'),red=mat('#a43749'),ink=mat('#202e38'),pink=mat('#bc7189'),skin=mat('#cab2a5'),gold=mat('#d4b75e'),green=mat('#559d83'),glass=new T.MeshStandardMaterial({color:'#8dcbc8',transparent:true,opacity:.22,roughness:.1,depthWrite:false});materials.push(glass);
 const batch=(g:T.BufferGeometry,m:T.Material)=>{const list=batches.get(m)||[];list.push(g);batches.set(m,list);};
 const stats:Record<string,string[]>={};
 for(const eq of roomEquipment){
  const room=rooms.find(r=>r.id===eq.roomId)!,n=eq.normal,t=eq.tangent,features:string[]=[];stats[eq.roomId]=features;
  const pos=(u:number,v:number)=>({x:eq.anchor.x+t.x*u+n.x*v,y:eq.anchor.y+t.y*u+n.y*v});
  const box=(u:number,h:number,v:number,w:number,height:number,d:number,m:T.Material,tilt=0)=>{const g=new T.BoxGeometry(t.x?w:d,height,t.x?d:w);g.rotateZ(tilt);const p=pos(u,v);g.translate(p.x,h,p.y);batch(g,m);};
  const sphere=(u:number,h:number,v:number,r:number,m:T.Material,sx=1,sy=1,sz=1)=>{const g=new T.SphereGeometry(r,12,8),p=pos(u,v);g.scale(sx,sy,sz);g.translate(p.x,h,p.y);batch(g,m);};
  const ball=(u:number,h:number,v:number,r=3)=>{sphere(u,h,v,r,ivory);const g=new T.SphereGeometry(r*1.01,12,8,0,Math.PI*2,0,Math.PI/2),p=pos(u,v);g.translate(p.x,h,p.y);batch(g,red);box(u,h,v,r*2,.7,r*2,ink);sphere(u,h,v+r*.8,r*.29,ivory);};
  const sign=(text:string,subtitle:string,u=0,h=69,width=94)=>{const c=document.createElement('canvas');c.width=768;c.height=256;const g=c.getContext('2d')!;g.fillStyle='#202f38';g.fillRect(0,0,768,256);g.strokeStyle=room.color;g.lineWidth=8;g.strokeRect(10,10,748,236);g.fillStyle='#d4d3b8';g.font='bold 42px monospace';g.fillText(text,27,65,715);g.font='24px monospace';g.fillText(subtitle,27,111,710);
   // Original equipment diagram: Pokeball and waveform, not a borrowed game screenshot.
   g.beginPath();g.arc(90,180,39,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(51,180);g.lineTo(129,180);g.stroke();g.beginPath();g.arc(90,180,10,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(168,184);for(let i=0;i<26;i++)g.lineTo(168+i*21,184+(i%6===1?-20:i%6===2?30:0));g.stroke();
   const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);const m=new T.MeshStandardMaterial({map:texture,roughness:.9});materials.push(m);const geo=new T.PlaneGeometry(width,31),p=pos(u,1.85),mesh=new T.Mesh(geo,m);mesh.position.set(p.x,h,p.y);mesh.rotation.y=Math.atan2(n.x,n.y);scene.add(mesh);objects.push(mesh);geometries.push(geo);};
  if(eq.roomId==='archive'){
   features.push('research bench','Pokedex terminal','Pokeball specimens','research books','filing cabinets','scratched specimen glass');
   for(const u of [-43,43]){box(u,20,6,12,37,11,steel);for(const h of [9,21,33])box(u,h,12.3,7,1,1,gold);}
   box(0,26,6,70,3,12,ivory);box(-19,37,4,19,17,4,ink);box(-19,37,6.2,16,12,.5,green);box(-19,27.8,9,22,1,6,steel);box(-19,44.5,6.55,15,.7,.3,ink,.08); // broken CRT
   for(const u of [4,14,24])ball(u,30,6,3.5);
   for(let i=0;i<5;i++)box(-3+i*3,31+i%2,3,2,7+i%3,6,i%2?pink:gold,.08*i);
   box(32,41,4,12,24,7,glass);box(32,28,4,14,2,9,ink);box(32,53,4,14,2,9,steel);box(34,40,7.9,.6,20,.3,ivory,.16);
   sign('POKEDEX / FIELD NOTES','OAK LAB | SPECIMEN 001 / 004 / 007');
  }else if(eq.roomId==='medical'){
   features.push('six-ball healing machine','recovery bed','stained bedding','medical cabinets','Nurse Joy figure','damaged reception monitor');
   box(36,22,12,18,27,14,ivory);box(36,34,12,20,3,16,pink);for(const u of [31,36,41])for(const v of [9,15])ball(u,37,v,2.2);
   box(36,48,3,18,15,4,ink);box(36,48,5.2,15,11,.5,green);box(36,48,5.6,16,1,.2,ink,.18);
   // Seated abandoned Nurse Joy mannequin: pink buns, cap and blood-stained apron; no actor/enemy.
   sphere(-43,42,14,5,skin);sphere(-43,47,14,5.8,pink,1,.65,1);for(const u of [-49,-37])sphere(u,44,14,3.3,pink);
   box(-43,49,14,10,3,9,ivory);box(-43,49,18.6,1,2.4,.2,red);box(-43,49,18.65,3,1,.2,red);
   box(-43,30,14,13,18,9,pink);box(-43,29,19,9,16,.5,ivory);box(-45,28,19.4,3,5,.3,red,.12);box(-41,24,19.4,2,4,.3,red,-.2);
   for(const u of [-51,-35]){box(u,31,14,3,14,4,pink);sphere(u,24,14,2,skin);}for(const u of [-46,-40])box(u,17,20,4,12,5,ivory);
   box(-17,21,12,27,2,23,ivory,.035);box(-12,22.3,13,12,.3,8,red,.1); // disordered non-graphic bedding
   sign('NURSE JOY / HEALING','RECOVERY WARD | MONITOR LINK LOST');
  }else if(eq.roomId==='comms'){
   features.push('Rotom waveform monitors','antennas','relay consoles');sign('ROTOM RELAY','FREQUENCY / PHASE | SIGNAL LOST');for(const u of [-39,0,39]){box(u,66,4,1.2,18,1.2,steel);sphere(u,76,4,2,gold);}box(0,40,eq.depth+1,13,17,.6,red);sphere(0,40,eq.depth+2,5,blueMaterial());
  }else if(eq.roomId==='electrical'){
   features.push('generator banks','breaker panels','Pokemon power research');sign('POWER PLANT / CAUTION','ELECTRIC SPECIMEN RESEARCH',0,74);for(const u of [-36,-12,12,36]){box(u,26,5.5,12,4,.8,gold);box(u,28,6.1,2,6,.5,red,.2);}
  }else if(eq.roomId==='reactor'){
   features.push('Infinity Core','damaged stabilizers','energy monitor');sign('INFINITY ENERGY','STABILIZERS A / B | FICTIONAL CORE',0,82,105);sphere(0,36,14,8,green);for(const u of [-30,30])box(u,46,8,13,3,1,gold);
  }else if(eq.roomId==='cooling'){
   features.push('Cerulean water treatment','pressure valves','leak signage');sign('CERULEAN / PUMPS','PRESSURE | FLOW | RETURN',0,80);for(const u of [-28,28])box(u,15,7,9,12,6,steel);
  }else if(eq.roomId==='containment'){
   features.push('Aether chambers','failed specimen locks','cracked glass');sign('AETHER / SPECIMEN WING','SEAL 094 FAILED | EVACUATE',0,82);for(const u of [-30,30]){box(u,43,23,9,4,1,red);ball(u,9,12,3);}
  }else if(eq.roomId==='security'){
   features.push('Silph CCTV','corporate access control');sign('SILPH CO. / SECURITY','CCTV RECORDING INTERRUPTED',0,76);for(const u of [-25,25]){box(u,61,4,13,6,6,ink);sphere(u,61,8,2,red);}
  }else if(eq.roomId==='storage'){
   features.push('Poke Mart stock','potions','damaged shipping labels');sign('POKE MART / SUPPLIES','POTIONS | ANTIDOTES | FIELD STOCK',0,76);for(const u of [-38,-26,-14,14,26,38]){box(u,32,11,5,9,5,u<0?pink:green);box(u,38,11,4,3,4,ivory);}
  }else if(eq.roomId==='workshop'){
   features.push('Pokeball assembly','shell components','repair tools');sign('POKE BALL WORKSHOP','ASSEMBLY BENCH / REPAIR',0,78);for(const u of [-30,0,30])ball(u,26,10,4);for(const u of [-15,15])box(u,25,10,2,2,10,gold,.08);
  }else if(eq.roomId==='hub'){
   features.push('trainer assembly board');sign('TRAINER ASSEMBLY','FIELD TEAMS A / B | CHECK IN');
  }else if(eq.roomId==='emergency'){features.push('Indigo command console');sign('INDIGO COMMAND','INCIDENT RESPONSE / BOTH TEAMS',0,77);}
  if(!cutaway&&['archive','medical'].includes(eq.roomId)){const p=pos(0,50),light=new T.PointLight(eq.roomId==='medical'?'#b8c9b4':'#dbba88',550,180,1.6);light.position.set(p.x,78,p.y);scene.add(light);lights.push(light);objects.push(light);}
 }
 // Additional room-specific benches/stock/ward furniture use the same canonical footprint as collision/maps.
 for(const station of themedStations){const n=station.normal,t=station.tangent,at=(u:number,v:number)=>({x:station.anchor.x+t.x*u+n.x*v,y:station.anchor.y+t.y*u+n.y*v});stats[station.roomId].push(station.kind);
  const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>{const p=at(u,v),g=new T.BoxGeometry(t.x?w:d,h,t.x?d:w);g.translate(p.x,y,p.y);batch(g,m);};
  const ball=(u:number,y:number,v:number)=>{const p=at(u,v),g=new T.SphereGeometry(4,12,8);g.translate(p.x,y,p.y);batch(g,ivory);const top=new T.SphereGeometry(4.05,12,8,0,Math.PI*2,0,Math.PI/2);top.translate(p.x,y,p.y);batch(top,red);box(u,y,v,8,.8,8,ink);};
  const depth=station.depth,v=depth/2+1;
  if(station.kind==='research-bench'){
   box(0,26,v,156,3,depth,steel);for(const u of [-72,72])box(u,12,v,5,24,depth,steel);
   for(const u of [-50,0,50]){box(u,36,7,25,19,6,ink);box(u,36,10.2,21,14,.4,u===0?green:ivory);box(u,36,10.5,21,1,.3,ink);ball(u,32,23);}
   for(let i=0;i<8;i++)box(-35+i*4,29+i%3,17,3,3,9,i%2?gold:pink);
   box(63,34,9,16,14,12,glass);box(63,42,9,18,2,14,steel);box(64,34,15.2,.7,12,.2,ivory);
  }else if(station.kind==='library-cabinet'){
   box(0,27.5,v,156,55,depth,steel);for(const h of [11,28,45]){box(0,h,depth+1,150,2,1,ivory);for(let i=0;i<22;i++)box(-68+i*6,h+6,depth+.5,4,10+(i%2)*2,1.5,i%3===0?gold:i%3===1?pink:green);}
  }else if(station.kind==='recovery-beds'){
   box(0,67,2,156,2,2,steel);for(let i=0;i<16;i++){box(-73+i*9.5,50,2,8.8,30,1,i%2?ivory:pink);if(i%5===0)box(-73+i*9.5,44,2.7,4,11,.3,red);}
   for(const u of [-40,40]){box(u,12,v,68,4,depth,steel);box(u,17,v,66,7,depth-2,ivory);box(u-23,23,v,15,5,depth-3,ivory);box(u+7,22,v,34,2,depth-1,pink);box(u+8,23.1,v+4,18,.2,8,red);for(const leg of [-28,28])box(u+leg,5,v,4,10,depth-4,steel);}
  }else{box(0,16,v,156,32,depth,ivory);box(0,33,v,156,3,depth,pink);box(-41,43,7,29,18,6,ink);box(-41,43,10.2,25,13,.5,green);box(-41,43,10.5,24,.8,.2,ink);for(const u of [8,26,44,62]){box(u,40,7,9,12,7,ivory);box(u,48,7,6,3,5,red);}box(0,19,depth+1,17,22,.5,red);box(0,19,depth+1.4,7,17,.3,ivory);box(0,19,depth+1.4,14,6,.3,ivory);}
 }
 function blueMaterial(){return green;}
 for(const [m,list] of batches){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());if(!geo)continue;geometries.push(geo);const mesh=new T.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);objects.push(mesh);}
 return {stats,update(time:number,reduced:boolean){for(const [i,l]of lights.entries())l.intensity=reduced?550:520+Math.sin(time*3.3+i)*22+(Math.sin(time*.7+i)>.94?-100:0);},dispose(){objects.forEach(o=>scene.remove(o));geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
