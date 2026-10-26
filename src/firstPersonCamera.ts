export const FIRST_PERSON={height:46,near:.8,minPitch:-1.05,maxPitch:1.1};
export function firstPersonPose(position:{x:number;y:number},yaw:number,pitch:number){const p=Math.max(FIRST_PERSON.minPitch,Math.min(FIRST_PERSON.maxPitch,pitch)),head={x:position.x,y:FIRST_PERSON.height,z:position.y};return {position:head,target:{x:head.x+Math.cos(yaw)*Math.cos(p)*100,y:head.y-Math.sin(p)*100,z:head.z+Math.sin(yaw)*Math.cos(p)*100},pitch:p,distance:0};}

/** Hide an overlapping local follower in narrow passages; restore it outside head space. */
export function firstPersonCompanionOpacity(gap:number){return Math.max(0,Math.min(1,(gap-24)/24));}
