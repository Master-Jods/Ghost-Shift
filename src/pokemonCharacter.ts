import {runtimePokemonRig}from './runtimePokemonRig';
import * as T from 'three';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'three/addons/utils/SkeletonUtils.js';
import {pokemonAsset,assetCandidates,ensurePokemonAssets,type PokemonAsset,type SpriteClip,type CharacterClip} from './pokemonAssets';
import {spriteDirection,spriteFrame,spriteUV,boundedLocomotionRate} from './spriteAnimation';
import type {MotionState} from './engine';
/** All network assets share one bounded queue, including prefetches. */
export class AssetDownloads{
 private running=0;private queue:(()=>void)[]=[];
 constructor(readonly limit=4){}
 run<T>(work:()=>Promise<T>){return new Promise<T>((resolve,reject)=>{this.queue.push(()=>{this.running++;work().then(resolve,reject).finally(()=>{this.running--;this.pump();});});this.pump();});}
 private pump(){while(this.running<this.limit&&this.queue.length)this.queue.shift()!();}
 get diagnostics(){return {running:this.running,queued:this.queue.length,limit:this.limit};}
}
export const assetDownloads=new AssetDownloads();
const draco=new DRACOLoader().setDecoderPath('/draco/').setWorkerLimit(2);
type TextureLease={texture:T.Texture;dispose:()=>void};
async function imageTexture(clip:SpriteClip,signal:AbortSignal):Promise<TextureLease>{return assetDownloads.run(async()=>{
 signal.throwIfAborted();const response=await fetch(clip.path+'?sha='+clip.sha256,{signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])});if(!response.ok)throw Error('Sprite HTTP '+response.status);const data=await response.arrayBuffer();
 if(globalThis.crypto?.subtle){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==clip.sha256)throw Error('Sprite checksum mismatch');}
 const blob=new Blob([data],{type:'image/png'});let bitmap:ImageBitmap|HTMLImageElement,objectURL:string|undefined,flipped=false;
 if(typeof createImageBitmap==='function'){bitmap=await createImageBitmap(blob,{imageOrientation:'flipY',premultiplyAlpha:'none'});flipped=true;}
 else{const img=new Image();objectURL=URL.createObjectURL(blob);img.src=objectURL;try{await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Image decode timeout')),12000))]);}finally{URL.revokeObjectURL(objectURL);}bitmap=img;}
 if(bitmap.width!==clip.width||bitmap.height!==clip.height){if('close'in bitmap)bitmap.close();throw Error('Sprite dimension mismatch');}
 const texture=new T.Texture(bitmap);texture.colorSpace=T.SRGBColorSpace;texture.flipY=!flipped;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 return {texture,dispose(){texture.dispose();if('close'in bitmap)bitmap.close();}};
 });}
type Template={kind:'sprite';textures:Record<string,T.Texture>;failed:string[];dispose:()=>void}|{kind:'gltf';root:T.Group;clips:T.AnimationClip[];dispose:()=>void};
export class CharacterAssetCache{
 private entries=new Map<string,{refs:number;promise:Promise<Template>;value?:Template;used:number;controller:AbortController}>();private running=0;private queue:(()=>void)[]=[];
 constructor(readonly concurrency=2,readonly idleLimit=8){}
 acquire(spec:PokemonAsset){const key=spec.id+':'+spec.path;let entry=this.entries.get(key);if(!entry){let resolve!:(v:Template)=>void,reject!:(e:unknown)=>void;const promise=new Promise<Template>((a,b)=>{resolve=a;reject=b;});entry={refs:0,promise,used:Date.now(),controller:new AbortController()};this.entries.set(key,entry);const selected=entry;this.queue.push(()=>{this.running++;void this.load(spec,selected.controller.signal).then(v=>{if(selected.controller.signal.aborted||selected.refs===0){v.dispose();reject(Error('Asset lease cancelled.'));return;}selected.value=v;resolve(v);},e=>{if(this.entries.get(key)===selected)this.entries.delete(key);reject(e);}).finally(()=>{this.running--;this.pump();this.trim();});});}entry.refs++;entry.used=Date.now();this.pump();let released=false;return {promise:entry.promise,release:()=>{if(released)return;released=true;entry!.refs--;entry!.used=Date.now();if(!entry!.refs&&!entry!.value){entry!.controller.abort();if(this.entries.get(key)===entry)this.entries.delete(key);}this.trim();}};}
 private pump(){while(this.running<this.concurrency&&this.queue.length)this.queue.shift()!();}
 private async load(spec:PokemonAsset,signal:AbortSignal):Promise<Template>{
  signal.throwIfAborted();if(!spec.verified||!spec.license)throw Error('Asset source/permission is not verified.');
  if(spec.representation==='directional-sprite'&&spec.sprite){const textures:Record<string,T.Texture>={},owned:TextureLease[]=[],failed:string[]=[];const clips=Object.values(spec.sprite.clips);await Promise.all(clips.map(async clip=>{try{const lease=await imageTexture(clip,signal);owned.push(lease);textures[clip.name]=lease.texture;}catch{failed.push(clip.name);}}));const required=[spec.clips.idle,spec.clips.run].filter(Boolean) as string[];if(required.some(k=>!textures[k])){owned.forEach(v=>v.dispose());throw Error('Required native locomotion/idle sheet failed; retain exact reference artwork.');}return {kind:'sprite',textures,failed,dispose(){owned.forEach(v=>v.dispose());}};}
  if(spec.representation!=='gltf'||!['approved','prototype-acknowledged'].includes(spec.model?.permissionStatus||''))throw Error('No compatible approved model.');
  const data=await assetDownloads.run(async()=>{const r=await fetch(spec.path,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});if(!r.ok)throw Error('Model HTTP '+r.status);const data=await r.arrayBuffer();if(data.byteLength>32*1024*1024||spec.model?.bytes&&data.byteLength!==spec.model.bytes)throw Error('Invalid model size');if(spec.model?.gitBlobSha1&&globalThis.crypto?.subtle){const head=new TextEncoder().encode('blob '+data.byteLength+'\0'),bytes=new Uint8Array(head.length+data.byteLength);bytes.set(head);bytes.set(new Uint8Array(data),head.length);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-1',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==spec.model.gitBlobSha1)throw Error('Model source checksum mismatch');}return data;});const gltf=await new GLTFLoader().setDRACOLoader(draco).parseAsync(data,new URL('.',new URL(spec.path,location.href)).href);for(const name of Object.values(spec.clips))if(!gltf.animations.some(c=>c.name===name))throw Error('Model clip reference is missing.');
  return {kind:'gltf',root:gltf.scene,clips:gltf.animations,dispose(){gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.dispose();m.dispose();}}});}};
 }
 private trim(){const unused=[...this.entries.entries()].filter(([,e])=>e.refs===0&&e.value).sort((a,b)=>a[1].used-b[1].used);while(unused.length>this.idleLimit){const [key,e]=unused.shift()!;e.value!.dispose();this.entries.delete(key);}}
 get diagnostics(){return {entries:this.entries.size,references:[...this.entries.values()].reduce((n,e)=>n+e.refs,0),loading:this.running,queued:this.queue.length,downloads:assetDownloads.diagnostics};}
 clearUnused(){for(const [k,e]of this.entries)if(!e.refs&&e.value){e.value.dispose();this.entries.delete(k);}}
}
export const characterAssets=new CharacterAssetCache();
const logical=(s:MotionState):CharacterClip=>s==='victory'?'resolve':s==='interact'||s==='assist'?'assist':s==='contain'?'attack':s==='reaction'?'hit':s==='run'?'run':['attack','guard','hit','recover'].includes(s)?s as CharacterClip:'idle';
async function bestLease(id:number,signal?:AbortSignal){let last:unknown;for(const spec of assetCandidates(id)){signal?.throwIfAborted();const lease=characterAssets.acquire(spec),cancel=()=>lease.release();signal?.addEventListener('abort',cancel,{once:true});try{const template=await lease.promise;signal?.throwIfAborted();return {spec,template,release(){signal?.removeEventListener('abort',cancel);lease.release();}};}catch(e){signal?.removeEventListener('abort',cancel);lease.release();last=e;}}throw last||Error('No approved animated asset for this exact ID.');}
export async function prefetchPokemon(ids:number[],signal?:AbortSignal){await ensurePokemonAssets();signal?.throwIfAborted();const outcomes=await Promise.allSettled([...new Set(ids)].filter(id=>assetCandidates(id).length).map(id=>bestLease(id,signal)));let closed=false;const result={outcomes,release(){if(closed)return;closed=true;for(const row of outcomes)if(row.status==='fulfilled')row.value.release();}};if(signal?.aborted)result.release();return result;}

export function createPokemonCharacter(id:number){
 let spec=pokemonAsset(id);const root=new T.Group(),cancellation=new AbortController();let release:(()=>void)|undefined;let dead=false,template:Template|undefined,model:T.Group|undefined,mixer:T.AnimationMixer|undefined,current='',action:T.AnimationAction|undefined;const ownedMaterials:T.Material[]=[],ownedGeometry:T.BufferGeometry[]=[],actions=new Map<string,T.AnimationAction>();
 const planes:[T.Mesh<T.PlaneGeometry,T.MeshStandardMaterial>,T.Mesh<T.PlaneGeometry,T.MeshStandardMaterial>]=[0,1].map(()=>{const g=new T.PlaneGeometry(1,1),m=new T.MeshStandardMaterial({transparent:true,alphaTest:.06,roughness:1,side:T.DoubleSide});ownedGeometry.push(g);ownedMaterials.push(m);const mesh=new T.Mesh(g,m);mesh.visible=false;root.add(mesh);return mesh;}) as any;
 let rig:ReturnType<typeof runtimePokemonRig>|undefined;let activePlane=0,transition=1,lastKey='',previousKey='',locomotionTime=0,loopTime=0,lastState='',basePixels=32;
 root.name='pokemon-'+id;root.userData={speciesId:id,representation:spec.representation,ready:false,state:'idle',movement:spec.movement};
 const ready=bestLease(id,cancellation.signal).then(result=>{release=result.release;spec=result.spec;const value=result.template;if(dead){release();return false;}template=value;root.userData.representation=spec.representation;
  if(value.kind==='gltf'){model=skeletonClone(value.root) as T.Group;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;if(!Number.isFinite(height)||height<=0)throw Error('Invalid model bounds');const fit=spec.scale/height;model.scale.multiplyScalar(fit);model.position.x-=(bounds.min.x+bounds.max.x)*.5*fit;model.position.z-=(bounds.min.z+bounds.max.z)*.5*fit;model.position.y+=spec.groundOffset-bounds.min.y*fit;model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const a=m.clone();a.userData.baseOpacity=m.opacity;a.userData.baseTransparent=m.transparent;ownedMaterials.push(a);return a;});if(o.material.length===1)o.material=o.material[0];}});root.add(model);rig=runtimePokemonRig(model,spec.movement);mixer=new T.AnimationMixer(model);for(const [state,name]of Object.entries(spec.clips)){const clip=value.clips.find(c=>c.name===name);if(clip)actions.set(state,mixer.clipAction(clip));}}
  else{basePixels=spec.sprite!.clips[spec.clips.run!].opaqueHeight;root.userData.failedClips=value.failed;}
  root.userData.ready=true;return true;
 }).catch(()=>{root.userData.failed=true;return false;});
 return {root,get spec(){return spec;},ready,update(yaw:number,state:MotionState,time:number,dt:number,speed:number,age:number,reduced=false,alpha=1){
  if(!template)return;const next=logical(state);let requested=next==='run'&&speed<3?'idle':next;
  if(template.kind==='sprite'){
   const sprite=spec.sprite!,fallback=sprite.mappings.idle!;
   if(requested==='idle'&&next==='idle'&&['attack','hit'].includes(lastState)){const previous=sprite.clips[sprite.mappings[lastState as CharacterClip]||''];if(previous){const duration=previous.durations.reduce((a,b)=>a+b,0)/60,rate=Math.min(1.8,Math.max(.5,duration/(lastState==='hit'?.6:.85)));if(age*rate<duration)requested=lastState as CharacterClip;}}
   const named=sprite.mappings[requested],name=named&&template.textures[named]?named:fallback,clip=sprite.clips[name],isMoving=requested==='run';
   if(requested!==lastState){loopTime=0;lastState=requested;}if(dt>0){if(isMoving)locomotionTime+=dt*boundedLocomotionRate(speed,spec.referenceSpeed);else loopTime+=dt;}
   const oneShot=['attack','hit','resolve'].includes(requested),nativeDuration=clip.durations.reduce((a,b)=>a+b,0)/60,phase=oneShot?Math.max(0,age)*Math.min(1.8,Math.max(.5,nativeDuration/(requested==='hit'?.6:requested==='resolve'?1.2:.85))):isMoving?locomotionTime:loopTime;
   const noIdle=sprite.mappings.idle===sprite.mappings.run&&requested==='idle',frame=noIdle||reduced&&requested==='idle'?0:spriteFrame(clip,phase,!oneShot),camera=root.userData.cameraPosition||{x:root.position.x+Math.cos(yaw),z:root.position.z+Math.sin(yaw)},bearing=Math.atan2(camera.z-root.position.z,camera.x-root.position.x),row=spriteDirection(yaw,bearing,clip.rows),key=name+':'+row+':'+frame;
   root.rotation.y=Math.atan2(camera.x-root.position.x,camera.z-root.position.z);
   if(name!==current){activePlane=1-activePlane;transition=0;previousKey=lastKey;current=name;}
   const mesh=planes[activePlane],ratio=spec.scale/basePixels,anchor=clip.anchors[row][frame],groundPad=['flight','hover','aquatic'].includes(spec.movement)?0:sprite.clips[spec.clips.run!].groundPad;
   mesh.visible=true;mesh.material.map=template.textures[name];mesh.scale.set(clip.frameWidth*ratio,clip.frameHeight*ratio,1);mesh.position.set((clip.frameWidth/2-anchor[0])*ratio,(anchor[1]-clip.frameHeight/2+groundPad)*ratio+spec.groundOffset,0);
   const uv=mesh.geometry.getAttribute('uv'),coords=spriteUV(clip,row,frame);for(let i=0;i<4;i++)uv.setXY(i,coords[i*2],coords[i*2+1]);uv.needsUpdate=true;
   transition=Math.min(1,transition+Math.max(0,dt)/.08);mesh.material.opacity=alpha*transition;const previous=planes[1-activePlane];previous.visible=transition<1&&!!previous.material.map;previous.material.opacity=alpha*(1-transition);previous.position.z=-.01;
   root.userData.state=requested;root.userData.clip=name;root.userData.clipTime=phase;root.userData.frame=frame;root.userData.direction=row;root.userData.frameKey=key;root.userData.previousFrameKey=previousKey;root.userData.actionFallback=!named||!template.textures[named];root.userData.nativeAnimated=clip.animated;root.userData.pose=[name,row,frame];lastKey=key;
  }else if(mixer&&model){
   if(requested==='idle'&&['attack','hit'].includes(current)){const prior=actions.get(current),duration=prior?.getClip().duration||0,rate=Math.min(1.8,Math.max(.5,duration/(current==='hit'?.6:.85)));if(age*rate<duration)requested=current as CharacterClip;}
   root.rotation.y=-yaw+spec.facingCorrection;const mapped=actions.has(requested)?requested:actions.has('idle')?'idle':'',selected=actions.get(mapped),oneShot=['attack','hit','resolve'].includes(requested)&&mapped===requested;
   const duration=selected?.getClip().duration||1,rate=oneShot?Math.min(1.8,Math.max(.5,duration/(requested==='hit'?.6:requested==='resolve'?1.2:.85))):requested==='run'&&mapped==='run'?boundedLocomotionRate(speed,spec.referenceSpeed):1;
   if(selected&&current!==requested){selected.reset().setLoop(oneShot?T.LoopOnce:T.LoopRepeat,Infinity);selected.clampWhenFinished=true;selected.time=oneShot?Math.min(duration,Math.max(0,age)*rate):0;selected.play();if(action&&action!==selected)action.crossFadeTo(selected,.14,false);action=selected;current=requested;}
   rig?.restore();if(action)action.timeScale=reduced&&requested==='idle'?0:rate;mixer.update(Math.max(0,Math.min(.06,dt)));
   for(const m of ownedMaterials){m.opacity=(m.userData.baseOpacity??1)*alpha;m.transparent=alpha<1||!!m.userData.baseTransparent;}
   const runtime=!actions.has(requested),runtimePose=runtime?rig?.apply(requested,time,dt,speed,age,reduced):null;root.userData.animationOrigin=runtime?(rig?.jointCount?'runtime-rig':'runtime-root'):'native';root.userData.rigJoints=rig?.jointCount||0;root.userData.runtimePose=runtimePose;root.userData.state=requested;root.userData.clip=runtime?'Runtime rig: '+requested:selected?.getClip().name||'Runtime rig: '+requested;root.userData.clipTime=runtime?time:action?.time||0;root.userData.actionFallback=!actions.has(requested);root.userData.frameKey=root.userData.clip+':'+Math.floor((runtime?time:action?.time||0)*24);const bones:number[]=[];model.traverse(o=>{if(o instanceof T.Bone&&bones.length<48)bones.push(...o.quaternion.toArray().map(v=>Math.round(v*10000)/10000));});root.userData.pose=runtimePose||bones;
  }
  root.userData.worldTime=time;
 },dispose(){if(dead)return;dead=true;cancellation.abort();mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);model?.traverse(o=>{if(o instanceof T.SkinnedMesh)o.skeleton.dispose();});ownedMaterials.forEach(m=>m.dispose());ownedGeometry.forEach(g=>g.dispose());root.clear();release?.();}};
}
function oneShotAge(state:string,age:number){return ['attack','hit','resolve'].includes(state)?Math.max(0,age):0;}
