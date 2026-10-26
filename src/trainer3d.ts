import * as T from 'three';
import type {MotionState} from './engine';
/** Original articulated field researcher. Local +X is forward; feet remain grounded. */
export function createTrainer(role:'A'|'B'){
 const root=new T.Group(),materials:T.MeshStandardMaterial[]=[],geometries:T.BufferGeometry[]=[];
 const mat=(color:string)=>{const m=new T.MeshStandardMaterial({color,roughness:.82,transparent:true});materials.push(m);return m;};
 const coat=mat(role==='A'?'#c9d5d1':'#d4b578'),identity=mat(role==='A'?'#9d394b':'#426a88'),skin=mat('#bfa189'),dark=mat('#1b2b32'),visor=mat('#486d74');
 function part(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const g=new T.BoxGeometry(w,h,d);geometries.push(g);const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 part(root,0,29,0,14,21,18,coat);part(root,-8,29,0,5,17,13,dark);part(root,-11,29,0,2,12,10,identity); // backpack
 part(root,7.2,31,-4,1,4,5,identity);part(root,0,44,0,12,12,13,skin);part(root,0,50,0,14,4,16,identity);part(root,8,49,0,6,1.5,16,identity);part(root,6.2,45,0,1,3,12,visor);
 const legs:T.Group[]=[],arms:T.Group[]=[];
 for(const side of [-1,1]){const leg=new T.Group();leg.position.set(0,19,side*5);root.add(leg);part(leg,0,-7,0,6,14,7,dark);part(leg,2,-16,0,10,4,8,dark);legs.push(leg);const arm=new T.Group();arm.position.set(0,37,side*12);root.add(arm);part(arm,0,-7,0,6,15,6,coat);part(arm,0,-16,0,5,5,5,skin);arms.push(arm);}
 return {root,update(yaw:number,state:MotionState,time:number,travel:number,fade=1,reduced=false){root.rotation.y=-yaw;const swing=state==='run'?Math.sin(travel*.18)*.65:0;legs.forEach((leg,i)=>leg.rotation.z=(i?-1:1)*swing);arms.forEach((arm,i)=>{arm.rotation.z=state==='interact'||state==='assist'?1.1:['reaction','hit'].includes(state)?.65:state==='victory'?(i?-2.5:2.5):(i?1:-1)*swing*.8;});root.position.y=state==='run'&&!reduced?Math.abs(Math.sin(travel*.18))*.8:0;for(const m of materials)m.opacity=fade;root.userData.state=state;root.userData.phase=Math.floor(travel/8)%6;},dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
