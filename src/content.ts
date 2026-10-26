export const THREAT_LIBRARY=[
 {id:94,name:'Gengar',effect:'decoy',title:'Decoy signals',counter:'Scout reveals the authentic signature before containment.'},
 {id:93,name:'Haunter',effect:'ambush',title:'Ambush pressure',counter:'Guard absorbs the pressure pulses; then battle or contain.'},
 {id:92,name:'Gastly',effect:'fog',title:'Spectral fog',counter:'Visibility is reduced locally. Scout clears the fog until resolution.'},
 {id:479,name:'Rotom',effect:'interference',title:'Equipment interference',counter:'Nearby task controls jam. Assist grounds its interference.'},
 {id:609,name:'Chandelure',effect:'interference',title:'Relay interference',counter:'Suppress nearby equipment interference or contain the encounter.'},
 {id:491,name:'Darkrai',effect:'fog',title:'Nightmare veil',counter:'Scout clears the veil; Guard before battle or containment.'},
 {id:778,name:'Mimikyu',effect:'disguise',title:'False research object',counter:'Scout unmasks the disguise before attacks or containment.'},
 {id:354,name:'Banette',effect:'interference',title:'Mechanism disruption',counter:'Suppress the effect or resolve the encounter to use nearby mechanisms.'},
 {id:477,name:'Dusknoir',effect:'pursuit',title:'Corridor pressure',counter:'Pursuit stays inside a bounded radius. Guard, contain, or retreat.'},
 {id:478,name:'Froslass',effect:'frost',title:'Frost field',counter:'Local frost obscures landmarks. Scout breaks the frost field.'},
 {id:442,name:'Spiritomb',effect:'seal',title:'Area seal',counter:'An explicit guardian gate link seals a shortcut. Defeat or contain the guardian to reopen it; alternate loops remain open.'},
 {id:571,name:'Zoroark',effect:'illusion',title:'Illusion signals',counter:'Creates false silhouettes and route messages. Scout identifies the real target.'},
] as const;
export const EMERGENCIES=[
 {kind:'blackout',name:'Blackout',room:'electrical',steps:3,objective:'Route the emergency circuit to restore local lighting.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'either'},
 {kind:'comms',name:'Communications interference',room:'comms',steps:2,objective:'Repair the relay, then tune the indicated frequency.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'either'},
 {kind:'reactor',name:'Reactor instability',room:'reactor',steps:1,objective:'Both trainers activate separate stabilizers within 12 seconds.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'both'},
 {kind:'coolant',name:'Coolant failure',room:'cooling',steps:3,objective:'Repair valves in the shown order. A partner may assist.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'either'},
 {kind:'leak',name:'Containment leak',room:'containment',steps:2,objective:'Activate the two containment nodes before escalation.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'both'},
 {kind:'lockdown',name:'Door lockdown',room:'security',steps:2,objective:'Restore access at Security, or use the connected alternate route.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'either'},
 {kind:'corruption',name:'Research data corruption',room:'archive',steps:2,objective:'Retrieve the data fragment in Professor Oak\'s Research Lab, then apply it at Rotom Relay Station.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'either'},
 {kind:'overload',name:'Power overload',room:'electrical',steps:2,objective:'Propose shared power, obtain partner approval, then stabilize the circuit.',failure:'The session fails immediately if this emergency is not resolved within 60 active seconds.',scope:'either'},
] as const;
export const TASK_TYPES=[
 {kind:'wiring',name:'Electrical Wiring',room:'electrical',mode:'wiring',unlock:'wiring'},
 {kind:'circuit',name:'Door Power Routing',room:'electrical',mode:'routing',unlock:'power'},
 {kind:'signal',name:'Communications Calibration',room:'comms',mode:'signal'},
 {kind:'valves',name:'Coolant Control',room:'cooling',mode:'coolant'},
 {kind:'upload',name:'Research Data Transport',room:'archive',mode:'transfer'},
 {kind:'containment',name:'Dual Stabilization',room:'reactor',mode:'cooperative'}
] as const;
export const titleCase=(s:string)=>s.split('-').map(v=>v.charAt(0).toUpperCase()+v.slice(1)).join(' ');
