import{GAME_TITLE}from './branding.js';
export const RULES={
 scenario:{id:'ghost-shift',version:'ghost-shift-v10-critical-incidents',name:GAME_TITLE,facility:'Aster Research Facility'},
 countdownSeconds:3,guardianHP:100,finalWindowSeconds:12,approvalSeconds:25,previewSeconds:20,interactionRange:85,
 defaults:{duration:300,severity:'Standard',seed:482,scouting:true,variant:'Manual director',preset:'Standard',roster:[] as number[],taskCount:6,maxThreats:2,maxEmergencies:2,eventBudget:6,eventCooldown:5},
 presets:{Guided:{duration:300,severity:'Standard'},Standard:{duration:300,severity:'Standard'},Expert:{duration:300,severity:'Severe'}},
 limits:{duration:{min:120,max:300},seed:{min:1,max:999999}},
 allocations:[{id:'balanced',name:'Paired stabilization',description:'Partner approves the normal overload reset.'},{id:'priority',name:'Local bypass',description:'Partner approves an additional local reset.'}]
} as const;
export const allocation=(id:unknown)=>RULES.allocations.find(a=>a.id===id);
