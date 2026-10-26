/** Local keyboard ownership; menus keep normal focus traversal. */
export function journalTabIntent({playing,typing,modified,overlay,gameSurface,journalSurface}:{playing:boolean;typing:boolean;modified:boolean;overlay:string|null;gameSurface:boolean;journalSurface:boolean}):'open'|'close'|null{
 if(!playing||typing||modified)return null;
 if(overlay==='journal')return journalSurface?'close':null;
 return overlay===null&&gameSurface?'open':null;
}

/** Shared camera-relative keyboard/touch input; yaw is independent of trainer facing. */
export function cameraInput(forward:number,strafe:number,yaw=-Math.PI/2){const length=Math.max(1,Math.hypot(forward,strafe));return {x:(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)/length,y:(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)/length};}
