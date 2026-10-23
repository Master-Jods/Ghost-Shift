export const THREAT_LIBRARY=[
 {id:94,name:'Gengar',effect:'decoy',title:'Decoy signals',counter:'Scout reveals the authentic signature before containment.'},
 {id:93,name:'Haunter',effect:'ambush',title:'Ambush pressure',counter:'Guard absorbs the pressure pulses; then battle or contain.'},
 {id:92,name:'Gastly',effect:'fog',title:'Spectral fog',counter:'Visibility is reduced locally. Scout clears the fog until resolution.'},
 {id:479,name:'Rotom',effect:'interference',title:'Equipment interference',counter:'Nearby task controls jam. Assist grounds its interference.'},
 {id:609,name:'Chandelure',effect:'drain',title:'Energy siphon',counter:'Bounded zone drain never takes the reserve below 2. Contain or assist.'},
 {id:491,name:'Darkrai',effect:'fatigue',title:'Nightmare fatigue',counter:'Companion stamina drops in bounded pulses. Guard or retreat to recover.'},
 {id:778,name:'Mimikyu',effect:'disguise',title:'False research object',counter:'Scout unmasks the disguise before attacks or containment.'},
 {id:354,name:'Banette',effect:'tools',title:'Tool disruption',counter:'Recovery items are jammed nearby. Universal Guard and Contain remain usable.'},
 {id:477,name:'Dusknoir',effect:'pursuit',title:'Corridor pressure',counter:'Pursuit stays inside a bounded radius. Guard, contain, or retreat.'},
 {id:478,name:'Froslass',effect:'frost',title:'Frost field',counter:'Local movement slows. Scout breaks the frost field.'},
 {id:442,name:'Spiritomb',effect:'seal',title:'Area seal',counter:'A nearby optional shortcut seals. Assist breaks the seal; alternate loops remain open.'},
 {id:571,name:'Zoroark',effect:'illusion',title:'Illusion signals',counter:'Creates false silhouettes and route messages. Scout identifies the real target.'},
] as const;
export const EMERGENCIES=[
 {kind:'blackout',name:'Blackout',room:'electrical',steps:3,objective:'Route the emergency circuit to restore local lighting.',failure:'Backup lighting recovers; one bounded stamina pulse.',scope:'either'},
 {kind:'comms',name:'Communications interference',room:'comms',steps:2,objective:'Repair the relay, then tune the indicated frequency.',failure:'Interference clears and the incident is recorded as missed.',scope:'either'},
 {kind:'reactor',name:'Reactor instability',room:'reactor',steps:1,objective:'Both trainers activate separate stabilizers within 12 seconds.',failure:'The reactor enters a safe bypass; one energy is consumed if available.',scope:'both'},
 {kind:'coolant',name:'Coolant failure',room:'cooling',steps:3,objective:'Repair valves in the shown order. A partner may assist.',failure:'Local frost dissipates and a deadline miss is logged.',scope:'either'},
 {kind:'leak',name:'Containment leak',room:'containment',steps:2,objective:'Activate the two containment nodes before escalation.',failure:'Automatic safe isolation clears the leak with a bounded stamina cost.',scope:'both'},
 {kind:'lockdown',name:'Door lockdown',room:'security',steps:2,objective:'Restore access at Security, or use the connected alternate route.',failure:'The temporary door lock releases automatically.',scope:'either'},
 {kind:'corruption',name:'Research data corruption',room:'archive',steps:2,objective:'Retrieve the data fragment in Archive, then apply it at Communications.',failure:'The corrupted data is isolated; the mandatory dataset remains intact.',scope:'either'},
 {kind:'overload',name:'Power overload',room:'electrical',steps:2,objective:'Propose shared power, obtain partner approval, then stabilize the circuit.',failure:'The overload safely trips; no permanent resource lock is introduced.',scope:'either'},
] as const;
export const TASK_TYPES=[
 {kind:'wiring',name:'Reconnect electrical wiring',room:'electrical',mode:'sequence'},
 {kind:'circuit',name:'Route electrical circuits',room:'electrical',mode:'sequence',unlock:'power'},
 {kind:'signal',name:'Tune communication signal',room:'comms',mode:'dial'},
 {kind:'calibrate',name:'Calibrate laboratory equipment',room:'containment',mode:'dials'},
 {kind:'valves',name:'Balance coolant valves',room:'cooling',mode:'dials'},
 {kind:'upload',name:'Upload research data',room:'archive',mode:'transfer'},
 {kind:'access',name:'Restore access permissions',room:'security',mode:'code',unlock:'access'},
 {kind:'fuse',name:'Replace damaged fuse',room:'workshop',mode:'choice'},
 {kind:'containment',name:'Stabilize containment equipment',room:'reactor',mode:'cooperative',unlock:'containment'},
] as const;
export const titleCase=(s:string)=>s.split('-').map(v=>v.charAt(0).toUpperCase()+v.slice(1)).join(' ');
