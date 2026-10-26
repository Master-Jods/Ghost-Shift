import type { State } from './engine';
export type IncidentAlarm={id:string;kind:'emergency'|'pokemon';createdAt:number};
/** Select one sustained alarm from authoritative state. Emergencies take priority.
 * Pokemon stop alarming while either trainer is engaged; retreat resumes the warning.
 */
export function dangerIncident(state:State):IncidentAlarm|undefined {
 if(state.phase!=='playing'||state.paused)return;
 const emergency=state.emergencies.filter(e=>e.status==='active').sort((a,b)=>a.expiresAt-b.expiresAt||a.id.localeCompare(b.id))[0];
 if(emergency)return{id:emergency.id,kind:'emergency',createdAt:emergency.createdAt};
 const threat=state.threats.filter(t=>t.status==='active'&&!Object.values(state.players).some(p=>p.encounterId===t.instanceId)).sort((a,b)=>a.createdAt-b.createdAt||a.instanceId.localeCompare(b.instanceId))[0];
 if(threat)return{id:threat.instanceId,kind:'pokemon',createdAt:threat.createdAt};
}
