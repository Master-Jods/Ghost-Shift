import type {State,Task} from './engine.js';
export type TaskChoice={id:string;name:string;effects:string[]};
export const TASK_CHOICES:Record<string,TaskChoice[]>={circuit:[{id:'A',name:'Shortcut A',effects:['Power Joy Clinic / Trainer Hall. Shortcut B closes. Longer fallback corridors remain available.','Validate the circuit before doors change. Return to Power Plant Control to switch again.']},{id:'B',name:'Shortcut B',effects:['Power the Eastern service bypass. Shortcut A closes. Longer fallback corridors remain available.','Validate the circuit before doors change. Return to Power Plant Control to switch again.']}]};
export const taskChoices=(t:Task|undefined)=>t?TASK_CHOICES[t.kind]||[]:[];
export function taskChoiceCheck(_s:State,t:Task,r:'A'|'B',id:string){const ok=!!taskChoices(t).find(c=>c.id===id)&&!t.complete&&!t.option;return {ok,reason:ok?'Available route choice; circuit validation is still required.':'Choose an uncommitted route at your own terminal.'};}
