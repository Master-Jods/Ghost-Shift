import {distance,lineOfSight,move,pathDirection,walkable,type Vec,type MapState} from './world.js';
/** Companion navigation never contributes player collision. Ordinary catch-up uses legal swept move(). */
export function followCompanion(current:Vec,trainer:Vec,facing:Vec,dt:number,state:MapState){
 const desired={x:trainer.x-facing.x*28+facing.y*52,y:trainer.y-facing.y*28-facing.x*52};
 const target=walkable(desired,state)&&lineOfSight(trainer,desired,state)?desired:trainer;
 const gap=distance(current,target);
 // Only initial spawn/teleport or newly invalid geometry permits a safe reposition. Never routine corner travel.
 if(gap>800||!walkable(current,state))return {...target};
 if(gap<.2)return {...current};
 const dir=lineOfSight(current,target,state)?{x:(target.x-current.x)/gap,y:(target.y-current.y)/gap}:pathDirection(current,target,state);
 return move(current,dir,Math.min(dt*1.25,gap/185),state);
}
