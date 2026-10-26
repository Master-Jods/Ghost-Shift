import * as T from 'three';
import type {MotionState} from './engine';
/** Original lightweight crewmate mesh. Reference/rights: docs/CREWMATE-AUDIO.md.
 * Local +X is forward. The root is at floor level; no first-person hands.
 */
export function createTrainer(role:'A'|'B') {
 const root=new T.Group(),rig=new T.Group(),body=new T.Group();root.add(rig);rig.add(body);
 root.name='crewmate-'+role;root.userData.model='crewmate';
 const materials:T.MeshStandardMaterial[]=[],geometries:T.BufferGeometry[]=[];
 const mat=(color:string,roughness=.65,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness,transparent:true});materials.push(m);return m;};
 const suit=mat(role==='A'?'#cf3449':'#24bacb'),shade=mat(role==='A'?'#7e2135':'#14727f'),rim=mat('#172b36'),glass=mat('#9edfe9',.2,.35),shine=mat('#e4fbff',.15);
 function mesh(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1){geometries.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function capsule(parent:T.Object3D,x:number,y:number,z:number,r:number,length:number,m:T.Material,sx=1,sy=1,sz=1){return mesh(parent,new T.CapsuleGeometry(r,length,8,20),m,x,y,z,sx,sy,sz);}
 capsule(body,0,31,0,12,16,suit,1,1,1.12);
 capsule(body,-12,29,0,6,11,shade,.85,1,1.3); // actual backpack, not a human torso/arms
 capsule(body,-13,30,0,5.2,10,suit,.85,1,1.3);
 mesh(body,new T.SphereGeometry(1,24,16),rim,10.9,36,0,4.4,8.4,12.1);
 mesh(body,new T.SphereGeometry(1,24,16),glass,12.8,36.6,0,3.8,7.1,10.8);
 mesh(body,new T.SphereGeometry(1,16,10),shine,15.2,40,-2.3,.6,1.6,5.1);
 const legs=[-1,1].map(side=>{
   const foot=new T.Group();foot.position.set(0,9,side*7);rig.add(foot);
   capsule(foot,0,0,0,5.4,7,suit,1.1,1,1);
   mesh(foot,new T.SphereGeometry(1,20,12),shade,1.7,-5.5,0,6.5,3.2,5.5);
   return foot;
 });
 let stride=0;
 return {root,update(yaw:number,state:MotionState,time:number,travel:number,fade=1,reduced=false,dt=1/60){
   root.rotation.y=-yaw;
   stride+=(Number(state==='run')-stride)*(1-Math.exp(-18*Math.min(.1,dt)));
   const phase=travel*Math.PI/70,amount=stride*(reduced?.45:1);
   legs.forEach((foot,i)=>{const wave=Math.sin(phase+i*Math.PI);foot.position.x=wave*6*amount;foot.position.y=9+Math.max(0,-wave)*4*amount;foot.rotation.z=wave*.18*amount;});
   body.position.y=(Math.abs(Math.cos(phase))*.9)*amount;
   body.rotation.x=Math.sin(phase)*.035*amount;
   body.rotation.z=state==='interact'||state==='assist'?-.10:state==='hit'||state==='reaction'?.14:-.035*amount;
   rig.position.y=state==='victory'&&!reduced?Math.max(0,Math.sin(time*5))*3:0;
   rig.rotation.x=state==='victory'&&!reduced?Math.sin(time*5)*.09:0;
   for(const m of materials)m.opacity=fade;
   root.userData.state=state;root.userData.phase=phase;root.userData.stride=stride;
 },dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
