export const RULES={
 scenario:{id:'ghost-shift',version:'ghost-shift-wings-v4-collision',name:'Pokémon: Ghost Shift',facility:'Aster Research Facility'},
 countdownSeconds:3,initialItems:2,guardianHP:100,finalWindowSeconds:12,approvalSeconds:25,previewSeconds:20,interactionRange:85,
 recovery:{durationSeconds:12,readyStamina:60,itemStamina:40,maxStamina:100},
 defaults:{duration:300,budget:10,severity:'Standard',seed:482,scouting:true,variant:'Manual director',preset:'Standard',roster:[] as number[],taskCount:4,maxThreats:2,maxEmergencies:2,eventBudget:6,eventCooldown:5},
 presets:{Guided:{duration:300,budget:14,severity:'Standard'},Standard:{duration:300,budget:10,severity:'Standard'},Expert:{duration:240,budget:8,severity:'Severe'}},
 limits:{budget:{min:4,max:20},duration:{min:120,max:300},seed:{min:1,max:999999},recoveryDuration:{min:4,max:30},items:{min:0,max:4}},
 allocations:[{id:'balanced',name:'Balanced stabilization',cost:2,pulseDrain:0,shortcut:false,description:'Both trainers approve a two-energy stabilization of the overload.'},{id:'priority',name:'Priority bypass',cost:1,pulseDrain:0,shortcut:false,description:'One energy; the responder also completes an additional local reset.'}],
} as const;
export const allocation=(id:unknown)=>RULES.allocations.find(a=>a.id===id);
export const allocationCost=(id:unknown)=>allocation(id)?.cost??Infinity;
