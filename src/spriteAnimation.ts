import type {SpriteClip} from './pokemonAssets';
export const boundedLocomotionRate=(speed:number,reference=185)=>Math.min(1.8,Math.max(.45,speed/reference));
/** PMD source order: down, down-left, left, up-left, up, up-right, right, down-right. */
export function spriteDirection(facing:number,cameraBearing:number,rows=8){return rows===1?0:((Math.round((facing-cameraBearing)/(Math.PI/4))%8)+8)%8;}
export function spriteFrame(clip:SpriteClip,seconds:number,loop:boolean){const total=clip.durations.reduce((a,b)=>a+b,0),ticks=Math.max(0,seconds*clip.ticksPerSecond),at=loop?ticks%total:Math.min(total-.0001,ticks);let sum=0;for(let i=0;i<clip.frames;i++){sum+=clip.durations[i];if(at<sum)return i;}return clip.frames-1;}
export function spriteUV(clip:SpriteClip,row:number,frame:number){const x=frame*clip.frameWidth/clip.width,y=1-(row+1)*clip.frameHeight/clip.height,w=clip.frameWidth/clip.width,h=clip.frameHeight/clip.height;return [x,y+h,x+w,y+h,x,y,x+w,y];}
