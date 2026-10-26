/** Display identity only. Stable room IDs, geometry and task mechanics do not change. */
export const ROOM_IDENTITIES:Record<string,{name:string;short:string[];sub:string}>={
 arrival:{name:'Trainer Reception',short:['Reception'],sub:'TRAINER CHECK-IN'},
 hub:{name:'Trainer Assembly Hall',short:['Trainer','Hall'],sub:'ASSEMBLY / FIELD TEAMS'},
 electrical:{name:'Power Plant Control',short:['Power','Plant'],sub:'POKEMON POWER RESEARCH'},
 comms:{name:'Rotom Relay Station',short:['Rotom','Relay'],sub:'ROTOM SIGNAL ARRAY'},
 medical:{name:"Nurse Joy's Pokemon Clinic",short:['Joy Clinic'],sub:'POKEMON HEALING / RECOVERY'},
 reactor:{name:'Infinity Energy Core',short:['Infinity','Core'],sub:'DUAL STABILIZERS'},
 cooling:{name:'Cerulean Pump Station',short:['Cerulean','Pumps'],sub:'WATER TREATMENT / VALVES'},
 containment:{name:'Aether Containment Wing',short:['Aether','Wing'],sub:'SPECIMEN RESEARCH'},
 archive:{name:"Professor Oak's Research Lab",short:['Oak Lab'],sub:'POKEDEX / DATA ARCHIVE'},
 security:{name:'Silph Security Office',short:['Silph','Office'],sub:'CCTV / ACCESS CONTROL'},
 storage:{name:'Poke Mart Supply Depot',short:['Poke Mart'],sub:'TRAINER SUPPLIES'},
 workshop:{name:'Poke Ball Workshop',short:['Ball Shop'],sub:'ASSEMBLY / REPAIR'},
 west:{name:'West Service Corridor',short:['West svc'],sub:'WEST CONNECTOR'},
 emergency:{name:'Indigo Emergency Command',short:['Indigo','Command'],sub:'INCIDENT RESPONSE'},
 east:{name:'East Service Corridor',short:['East svc'],sub:'EAST CONNECTOR'},
 exit:{name:'Trainer Evacuation Gate',short:['Evac Gate'],sub:'BOTH TRAINERS REQUIRED'}
};
export const roomDisplay=(id:string)=>ROOM_IDENTITIES[id]?.name||'Service corridor';
