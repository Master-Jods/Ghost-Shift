import {ROOM_IDENTITIES} from './roomIdentity.js';
import {deriveLayout,wallBounds,type Vec,type Rect,type RoomEdge,type WallSegment} from './layoutGeometry.js';
export {wallBounds};export type {Vec,Rect,RoomEdge,WallSegment};
export type MapState = {
    worldTime?: number;revision?:number;extractionBlocked?:boolean;unknownBlocking?:boolean;route?:{finalReleased?:boolean;configuration:'A'|'B';sealed?:string[];overridden:string[];repaired:string[];guardianClear:string[];holds:Record<string,{role:'A'|'B';pokemon:number}>};
    threats?: {
        activeAt: number;
        status: string;
        behavior: string;
        disabledEffect: boolean;
        doorId?: string;
    }[];
    systems?:{wingPower:string|null};tasks?: {
        complete: boolean;
        unlock?: string;
    }[];
    emergencies?: {
        status: string;
        kind: string;
        doorId?: string;
    }[];
};
const roomColors:Record<string,string>={arrival:'#83c9bb',hub:'#5db5da',electrical:'#e6c75e',comms:'#80c6e5',medical:'#69ceb0',reactor:'#ef9768',cooling:'#75c7ef',containment:'#b19ae8',archive:'#baa272',security:'#748dd5',storage:'#c9a078',workshop:'#d1b552',west:'#82a5b1',emergency:'#d57878',east:'#82a5b1',exit:'#7fe5bb'};
/** Original Aster wing layout, inspired by the supplied schematic's adjacency. */
export const MAP_VERSION = 'aster-wings-v9-pokemon-rooms';
export const WORLD = { w: 6290, h: 4930 };
const layout: Record<string, [
    number,
    number,
    number,
    number
]> = {
    arrival: [200, 100, 200, 180], hub: [620, 60, 300, 240], containment: [1080, 120, 200, 180],
    medical: [440, 320, 180, 180], reactor: [40, 420, 180, 220], security: [250, 420, 140, 180],
    cooling: [1030, 390, 180, 170], east: [1280, 400, 160, 200], archive: [790, 400, 180, 180],
    electrical: [430, 650, 180, 180], storage: [680, 730, 260, 230], workshop: [220, 800, 180, 180],
    west: [80, 720, 120, 160], emergency: [1110, 710, 200, 180], comms: [970, 970, 200, 150], exit: [450, 950, 180, 160]
};
// Expand interiors into unused margins; centers and corridor lengths stay stable.
for (const id of Object.keys(layout)) {
 const r=layout[id], pad=['hub','storage'].includes(id)?15:['west','east'].includes(id)?10:20;
 layout[id]=[r[0]-pad,r[1]-pad,r[2]+pad*2,r[3]+pad*2];
}
export const MAP_SCALE=4.25;
for(const r of Object.values(layout))for(let i=0;i<4;i++)r[i]*=MAP_SCALE;
export const rooms = Object.entries(roomColors).map(([id,color]) => { const [x, y, w, h] = layout[id]; return { x, y, w, h, id, name:ROOM_IDENTITIES[id].name, sub:ROOM_IDENTITIES[id].sub, color }; });
export const center = (id: string): Vec => { const r = rooms.find(r => r.id === id)!; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
// Explicit corridors share the exact same rectangles in every consumer. Width 70-80, player radius 11.
export const corridors: Rect[] = [
    { x: 400, y: 170, w: 220, h: 70 }, { x: 490, y: 205, w: 70, h: 115 },
    { x: 920, y: 180, w: 160, h: 70 }, { x: 750, y: 300, w: 70, h: 100 }, { x: 780, y: 365, w: 150, h: 70 },
    { x: 620, y: 365, w: 130, h: 70 }, { x: 300, y: 280, w: 70, h: 140 }, { x: 130, y: 310, w: 220, h: 70 },
    { x: 130, y: 310, w: 70, h: 110 }, { x: 220, y: 490, w: 60, h: 70 },
    { x: 140, y: 640, w: 70, h: 80 }, { x: 165, y: 830, w: 55, h: 70 }, {x:245,y:600,w:160,h:90}, {x:245,y:645,w:90,h:155},
    { x: 400, y: 850, w: 100, h: 70 }, { x: 465, y: 830, w: 70, h: 120 }, { x: 610, y: 760, w: 70, h: 70 },
    { x: 610, y: 940, w: 70, h: 90 }, { x: 880, y: 580, w: 70, h: 150 },
    { x: 1170, y: 300, w: 70, h: 90 }, { x: 1210, y: 460, w: 70, h: 70 },
    { x: 1320, y: 600, w: 70, h: 180 }, { x: 1310, y: 745, w: 80, h: 70 },
    { x: 940, y: 795, w: 170, h: 70 }, { x: 1000, y: 865, w: 70, h: 105 }, { x: 940, y: 995, w: 30, h: 70 },
    { x: 930, y: 525, w: 100, h: 70 }, { x: 995, y: 560, w: 70, h: 235 }, {x:490,y:500,w:90,h:160}
];
// Widen narrow service passages without extending travel.
for(const c of corridors){if(c.w<c.h&&c.w<90){c.x-=(90-c.w)/2;c.w=90;}else if(c.h<=c.w&&c.h<90){c.y-=(90-c.h)/2;c.h=90;}}
for(const c of corridors){c.x*=MAP_SCALE;c.y*=MAP_SCALE;c.w*=MAP_SCALE;c.h*=MAP_SCALE;}
export const layoutGeometry=deriveLayout(rooms,corridors);
export const floors=layoutGeometry.floors, floorTiles=layoutGeometry.tiles, wallSegments=layoutGeometry.walls, roomWalls=layoutGeometry.roomWalls;
const floorHit=layoutGeometry.floorHit;
const floorClear=(p:Vec)=>[p,{x:p.x-12,y:p.y},{x:p.x+12,y:p.y},{x:p.x,y:p.y-12},{x:p.x,y:p.y+12}].every(floorHit);
/** Logical room connections only. They never generate posts, lintels or room shells. */
export const roomPortals=layoutGeometry.connections.filter(p=>p.length>=44&&[-20,0,20].every(offset=>floorClear({x:p.start.x+p.tangent.x*p.length/2+p.normal.x*offset,y:p.start.y+p.tangent.y*p.length/2+p.normal.y*offset})));
export type RoomEquipment = {
    roomId: string;
    kind: string;
    edge: RoomEdge;
    anchor: Vec;
    normal: Vec;
    tangent: Vec;
    length: number;
    depth: number;
    bounds: Rect;
    controls: [
        Vec,
        Vec
    ];
};
const equipmentPlan: Record<string, {
    kind: string;
    side: RoomEdge['side'];
    length: number;
    depth: number;
}> = {
    arrival: { kind: 'checkin', side: 'north', length: 76, depth: 4 }, hub: { kind: 'information', side: 'north', length: 100, depth: 4 },
    electrical: { kind: 'breakers', side: 'north', length: 100, depth: 6 }, comms: { kind: 'relay', side: 'south', length: 100, depth: 8 },
    medical: { kind: 'medical', side: 'south', length: 112, depth: 28 }, reactor: { kind: 'reactor', side: 'west', length: 112, depth: 28 },
    cooling: { kind: 'coolant', side: 'north', length: 100, depth: 14 }, containment: { kind: 'pods', side: 'east', length: 108, depth: 24 },
    archive: { kind: 'archive', side: 'east', length: 100, depth: 12 }, security: { kind: 'security', side: 'north', length: 100, depth: 8 },
    storage: { kind: 'supplies', side: 'south', length: 120, depth: 22 }, workshop: { kind: 'workbench', side: 'south', length: 108, depth: 20 },
    west: { kind: 'wayfinding', side: 'west', length: 66, depth: 2 }, emergency: { kind: 'override', side: 'south', length: 100, depth: 8 },
    east: { kind: 'navigation', side: 'east', length: 100, depth: 8 }, exit: { kind: 'airlock', side: 'south', length: 100, depth: 4 }
};
export const roomEquipment: RoomEquipment[] = rooms.map(r => {
    const plan = equipmentPlan[r.id], edges = roomWalls.filter(e => e.roomId === r.id).sort((a, b) => Number(b.side === plan.side) - Number(a.side === plan.side) || b.length - a.length);
    const edge = edges.find(e => e.length >= plan.length + 16) || [...edges].sort((a, b) => b.length - a.length)[0];
    const length = Math.min(plan.length, edge.length - 16), anchor = { x: edge.start.x + edge.tangent.x * (Math.floor(edge.length/10)*5), y: edge.start.y + edge.tangent.y * (Math.floor(edge.length/10)*5) }, normal = edge.normal, tangent = edge.tangent, depth = plan.depth;
    const corner = { x: anchor.x - tangent.x * length / 2, y: anchor.y - tangent.y * length / 2 }, other = { x: anchor.x + tangent.x * length / 2 + normal.x * depth, y: anchor.y + tangent.y * length / 2 + normal.y * depth };
    const bounds = { x: Math.min(corner.x, other.x), y: Math.min(corner.y, other.y), w: Math.abs(corner.x - other.x), h: Math.abs(corner.y - other.y) };
    const controls = [-30, 30].map(offset => ({ x: anchor.x + tangent.x * offset + normal.x * (depth + 32), y: anchor.y + tangent.y * offset + normal.y * (depth + 32) })) as [
        Vec,
        Vec
    ];
    return { roomId: r.id, kind: plan.kind, edge, anchor, normal, tangent, length, depth, bounds, controls };
});
/** Wall-side themed furniture with explicit physical footprints; never free-standing partitions. */
export const themedStations=roomEquipment.filter(e=>['archive','medical'].includes(e.roomId)).flatMap(eq=>{
 const kinds=eq.roomId==='archive'?['research-bench','library-cabinet']:['recovery-beds','reception-counter'];
 const edges=roomWalls.filter(e=>e.roomId===eq.roomId&&e!==eq.edge&&e.length>=260).sort((a,b)=>b.length-a.length).slice(0,2);
 return edges.map((edge,i)=>{const width=156,depth=i===1?24:32,height=eq.roomId==='archive'?55:i===1?54:27,anchor={x:edge.start.x+edge.tangent.x*edge.length/2,y:edge.start.y+edge.tangent.y*edge.length/2},n=edge.normal,t=edge.tangent,center={x:anchor.x+n.x*(depth/2+1),y:anchor.y+n.y*(depth/2+1)},w=t.x?width:depth,h=t.x?depth:width;return {id:eq.roomId+'-themed-'+i,roomId:eq.roomId,kind:kinds[i],anchor,normal:n,tangent:t,width,depth,height,bounds:{x:center.x-w/2,y:center.y-h/2,w,h}};});
});
export type Collider = {id:string;roomId:string;height?:number} & ({shape:'box';x:number;y:number;w:number;h:number}|{shape:'circle';x:number;y:number;r:number});
/** Solid visible equipment pieces, not the empty rectangular service bay around them. */
export const colliders:Collider[]=roomEquipment.flatMap(eq=>{
 const result:Collider[]=[],pos=(u:number,v:number)=>({x:eq.anchor.x+eq.tangent.x*u+eq.normal.x*v,y:eq.anchor.y+eq.tangent.y*u+eq.normal.y*v});
 const circle=(u:number,v:number,r:number)=>result.push({id:eq.roomId+'-'+result.length,roomId:eq.roomId,shape:'circle',...pos(u,v),r});
 const box=(u:number,v:number,w:number,d:number)=>{const p=pos(u,v),width=eq.tangent.x?w:d,height=eq.tangent.x?d:w;result.push({id:eq.roomId+'-'+result.length,roomId:eq.roomId,shape:'box',x:p.x-width/2,y:p.y-height/2,w:width,h:height});};
 if(eq.kind==='reactor'){circle(0,14,13);for(const u of [-30,30])box(u,4,18,8);}
 else if(eq.kind==='coolant'){for(const u of [-28,28])circle(u,7,3);}
 else if(eq.kind==='pods'){for(const u of [-30,30])circle(u,12,11);box(0,4,eq.length,8);}
 else if(eq.kind==='medical'){box(-20,14,64,28);circle(36,14,10);circle(36,4,2);}
 else box(0,eq.depth/2,eq.length,eq.depth);
 return result;
});
for(const station of themedStations)colliders.push({id:station.id,roomId:station.roomId,height:station.height,shape:'box',...station.bounds});
export const obstacles:Rect[]=colliders.map(c=>c.shape==='box'?{x:c.x,y:c.y,w:c.w,h:c.h}:{x:c.x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2});
export const PLAYER_RADIUS=11;
export function colliderIntersects(c:Collider,p:Vec,radius=PLAYER_RADIUS){
 if(c.shape==='circle')return (p.x-c.x)**2+(p.y-c.y)**2<(radius+c.r)**2-1e-8;
 const dx=p.x-Math.max(c.x,Math.min(p.x,c.x+c.w)),dy=p.y-Math.max(c.y,Math.min(p.y,c.y+c.h));
 return radius===0?p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h:dx*dx+dy*dy<radius*radius-1e-8;
}
export function wallDistanceSquared(p:Vec,e:WallSegment){const x=e.axis==='x'?Math.max(e.x,Math.min(p.x,e.x+e.length)):e.x,y=e.axis==='z'?Math.max(e.z,Math.min(p.y,e.z+e.length)):e.z;return (p.x-x)**2+(p.y-y)**2;}
export const controlPoint = (roomId: string, role: 'A' | 'B' = 'A'): Vec => ({ ...roomEquipment.find(e => e.roomId === roomId)!.controls[role === 'A' ? 0 : 1] });
export const gateDefinitions = [
 {id:'hub-shortcut',x:490,y:570,w:90,h:14,unlock:'power',name:'Shortcut A / Joy Clinic - Power Wing',kind:'switch',controlRoom:'electrical'},
 {id:'east-shortcut',x:985,y:630,w:90,h:14,unlock:'power',name:'Shortcut B / Eastern bypass',kind:'switch',controlRoom:'electrical'},
 {id:'research-access',x:740,y:335,w:90,h:14,unlock:'wiring',name:'Research access',kind:'task',controlRoom:'security'},
 {id:'held-passage',x:130,y:675,w:90,h:14,unlock:'latch',name:'West maintenance passage',kind:'held',controlRoom:'west'},
 {id:'extraction-north',x:455,y:915,w:90,h:14,unlock:'final',name:'Final extraction / north',kind:'final',controlRoom:'exit'},
 {id:'extraction-east',x:645,y:930,w:14,h:110,unlock:'final',name:'Final extraction / east',kind:'final',controlRoom:'exit'}
].map(d=>{if(d.kind==='final'){const edge=roomPortals.find(p=>p.roomId==='exit'&&p.side===(d.id==='extraction-north'?'north':'east'))!;return {...d,x:edge.start.x-(edge.side==='east'?7:0),y:edge.start.y-(edge.side==='north'?7:0),w:edge.side==='north'?edge.length:14,h:edge.side==='east'?edge.length:14};}return {...d,x:d.x*MAP_SCALE,y:d.y*MAP_SCALE,w:d.w*MAP_SCALE,h:d.h*MAP_SCALE};});
export const gateControl=(id:string)=>controlPoint(gateDefinitions.find(d=>d.id===id)?.controlRoom||'electrical');
const doorCache=new WeakMap<object,{revision:number;value:any[]}>();
export const invalidateDoorCache=(s:object)=>doorCache.delete(s);
export function doors(state?:MapState|number,_allocation?:string|null,_ready?:boolean){const s=typeof state==='object'?state:{},route=s.route;
 const cached=typeof state==='object'&&s.revision!==undefined?doorCache.get(s):undefined;if(cached&&cached.revision===s.revision)return cached.value;
 const value=gateDefinitions.map(d=>{const guardian=s.threats?.find(t=>t.status==='active'&&t.doorId===d.id),incident=s.emergencies?.some(e=>e.status==='active'&&e.kind==='lockdown'&&e.doorId===d.id),allDone=!!s.tasks?.length&&s.tasks.every(t=>t.complete),task=s.tasks?.find(t=>t.unlock===d.unlock),override=route?.overridden.includes(d.id),repaired=route?.repaired.includes(d.id);
 const base=d.kind==='switch'?!task?.complete||(route?.configuration||'A')!==(d.id==='hub-shortcut'?'A':'B'):d.kind==='held'?!repaired&&!route?.holds[d.id]:d.kind==='final'?!route?.finalReleased&&(!allDone||!!s.extractionBlocked||!!s.unknownBlocking||!!s.threats?.some(t=>t.status==='active'&&(t as any).blocking)||!!s.emergencies?.some(e=>e.status==='active'&&(e as any).blocking)):!!task&&!task.complete;
 const locked=typeof state==='object'&&!!(guardian||route?.sealed?.includes(d.id)||incident||(!override&&base));
 const reason=guardian||route?.sealed?.includes(d.id)?'Defeat or contain the linked guardian':incident?'Resolve the active lockdown':d.kind==='final'?'Complete all six normal tasks and clear extraction-blocking incidents':d.kind==='switch'?`Complete Door Power Routing; return to Power Plant Control to select ${d.id==='hub-shortcut'?'A':'B'}`:d.kind==='held'?'Assign a companion here or repair the latch permanently':'Complete Electrical Wiring or use the shared override key';
 return {...d,locked,reason:locked?reason:'Open',alternative:d.kind==='final'?'Final access has no prerequisite bypass':'Longer connected service corridors remain available',guardianId:guardian?(guardian as any).instanceId:undefined};});if(typeof state==='object'&&s.revision!==undefined)doorCache.set(s,{revision:s.revision,value});return value;
}
export const spawn={A:{x:265*MAP_SCALE,y:195*MAP_SCALE},B:{x:335*MAP_SCALE,y:195*MAP_SCALE}};
export const contains = (r: Rect, p: Vec, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const roomAt = (p: Vec) => rooms.find(r => contains(r, p))?.id || 'corridor';
export const roomName = (id: string) => rooms.find(r => r.id === id)?.name || 'Service corridor';
// Static broad phase only. Exact collision tests below still use canonical wall/equipment geometry.
const collisionCell=64;
function collisionBuckets<T>(items:T[],bounds:(item:T)=>Rect){const buckets=new Map<string,T[]>();for(const item of items){const b=bounds(item);for(let y=Math.floor((b.y-32)/collisionCell);y<=Math.floor((b.y+b.h+32)/collisionCell);y++)for(let x=Math.floor((b.x-32)/collisionCell);x<=Math.floor((b.x+b.w+32)/collisionCell);x++){const key=x+','+y,list=buckets.get(key)||[];list.push(item);buckets.set(key,list);}}return buckets;}
const wallBuckets=collisionBuckets(wallSegments,w=>({x:w.x,y:w.z,w:w.axis==='x'?w.length:0,h:w.axis==='z'?w.length:0}));
const equipmentBuckets=collisionBuckets(colliders,c=>c.shape==='box'?c:{x:c.x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2});
const bucketKey=(p:Vec)=>Math.floor(p.x/collisionCell)+','+Math.floor(p.y/collisionCell);
export function walkable(p:Vec,state?:MapState|number,_a?:string|null,_b?:boolean,radius=PLAYER_RADIUS){
 if(!floorHit(p))return false;
 if(radius>0&&(radius<=32?wallBuckets.get(bucketKey(p))||[]:wallSegments).some(w=>wallDistanceSquared(p,w)<radius*radius-1e-8))return false;
 if((radius<=32?equipmentBuckets.get(bucketKey(p))||[]:colliders).some(c=>colliderIntersects(c,p,radius)))return false;
 return !doors(state).some(d=>d.locked&&colliderIntersects({...d,shape:'box',roomId:'door'},p,radius));
}
export function move(p: Vec, v: Vec, dt: number, state?: MapState | number, _a?: string | null, _b?: boolean): Vec {
    const length = Math.hypot(v.x, v.y);
    if (!length)
        return p;
    const result = { ...p };
    const steps = Math.ceil(Math.min(.3, dt) / .04);
    for (let i = 0; i < steps; i++) {
        const speed = 185 * Math.min(.3, dt) / steps / Math.max(1, length);
        if (walkable({ x: result.x + v.x * speed, y: result.y }, state))
            result.x += v.x * speed;
        if (walkable({ x: result.x, y: result.y + v.y * speed }, state))
            result.y += v.y * speed;
    }
    return result;
}
export type Interactable = Vec & {
    id: string;
    name: string;
    kind: string;
    role?: 'A' | 'B';
};
export const points: Interactable[] = rooms.map(r => ({ ...center(r.id), id: r.id, name: r.name, kind: r.id === 'exit' ? 'exit' : 'terminal' }));
export const point = (id: string) => points.find(p => p.id === id)!;
export const nearby = (p: Vec, _r?: string, range = 85) => points.filter(t => distance(t, p) < range).sort((a, b) => distance(a, p) - distance(b, p))[0];
const navSize = 20, navCols = Math.ceil(WORLD.w / navSize), navRows = Math.ceil(WORLD.h / navSize);
const navBase = new Uint8Array(navCols * navRows);
for (let y = 0; y < navRows; y++)
    for (let x = 0; x < navCols; x++)
        navBase[y * navCols + x] = Number(walkable({ x: x * navSize + navSize/2, y: y * navSize + navSize/2 }, undefined, null, false, 12));
const flowCache = new Map<string, {
    cost: Int32Array;
    open: Uint8Array;
}>();
function flow(target: Vec, state?: MapState | number) {
    const locked = doors(state).filter(d => d.locked), key = Math.round(target.x / navSize) + ',' + Math.round(target.y / navSize) + '|' + locked.map(d => d.id).join();
    const cached = flowCache.get(key);
    if (cached)
        return cached;
    const open = navBase.slice();
    for (const d of locked)
        for (let y = Math.max(0, Math.floor((d.y - 13) / navSize)); y < Math.min(navRows, Math.ceil((d.y + d.h + 13) / navSize)); y++)
            for (let x = Math.max(0, Math.floor((d.x - 13) / navSize)); x < Math.min(navCols, Math.ceil((d.x + d.w + 13) / navSize)); x++)
                if (contains(d, { x: x * navSize + navSize/2, y: y * navSize + navSize/2 }, 12))
                    open[y * navCols + x] = 0;
    const cost = new Int32Array(open.length);
    cost.fill(-1);
    const queue = new Int32Array(open.length);
    let tail = 0, nearest = -1, best = Infinity;
    for (let y = Math.max(0, Math.floor(target.y / navSize) - 5); y < Math.min(navRows, Math.floor(target.y / navSize) + 6); y++)
        for (let x = Math.max(0, Math.floor(target.x / navSize) - 5); x < Math.min(navCols, Math.floor(target.x / navSize) + 6); x++) {
            const i = y * navCols + x, d = distance({ x: x * navSize + navSize/2, y: y * navSize + navSize/2 }, target);
            if (open[i] && d < best) {
                best = d;
                nearest = i;
            }
        }
    if (nearest >= 0) {
        queue[tail++] = nearest;
        cost[nearest] = 0;
    }
    for (let head = 0; head < tail; head++) {
        const i = queue[head], x = i % navCols, y = Math.floor(i / navCols);
        const visit=(j:number)=>{if(open[j]&&cost[j]<0){cost[j]=cost[i]+1;queue[tail++]=j;}};
        if(x>0)visit(i-1);if(x+1<navCols)visit(i+1);if(y>0)visit(i-navCols);if(y+1<navRows)visit(i+navCols);
    }

    const result = { cost, open };
    if (flowCache.size > 96)
        flowCache.delete(flowCache.keys().next().value!);
    flowCache.set(key, result);
    return result;
}
function swept(a: Vec, b: Vec, state?: MapState | number) {
    const count = Math.max(1, Math.ceil(distance(a, b) / 4));
    for (let i = 1; i <= count; i++)
        if (!walkable({ x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count }, state))
            return false;
    return true;
}
function navStart(start: Vec, cost: Int32Array, state?: MapState | number) {
    const ownX=Math.floor(start.x/navSize),ownY=Math.floor(start.y/navSize),own=ownY*navCols+ownX;
    if(ownX>=0&&ownX<navCols&&ownY>=0&&ownY<navRows&&cost[own]>=0&&swept(start,{x:ownX*navSize+navSize/2,y:ownY*navSize+navSize/2},state))return own;
    let result = -1, best = Infinity;
    const sx = Math.floor(start.x / navSize), sy = Math.floor(start.y / navSize);
    for (let y = sy - 2; y <= sy + 2; y++)
        for (let x = sx - 2; x <= sx + 2; x++) {
            const i = y * navCols + x;
            if (x < 0 || y < 0 || x >= navCols || y >= navRows || cost[i] < 0)
                continue;
            const p = { x: x * navSize + navSize/2, y: y * navSize + navSize/2 }, d = distance(start, p);
            const score = cost[i] * navSize + d;
            if (score < best && swept(start, p, state)) {
                best = score;
                result = i;
            }
        }
    return result;
}
export function pathDirection(start: Vec, target: Vec, state?: MapState | number, _a?: string | null, _b?: boolean): Vec {
    if (distance(start, target) < 45 && swept(start, target, state))
        return { x: target.x - start.x, y: target.y - start.y };
    const { cost } = flow(target, state);
    let i = navStart(start, cost, state);
    if (i < 0)
        return { x: 0, y: 0 };
    let to = { x: i % navCols * navSize + navSize/2, y: Math.floor(i / navCols) * navSize + navSize/2 };
    for (let step = 0; step < 4; step++) {
        const x = i % navCols, y = Math.floor(i / navCols), neighbors = [i - 1, i + 1, i - navCols, i + navCols].filter(j => j >= 0 && j < cost.length && cost[j] >= 0 && cost[j] < cost[i] && Math.abs(j % navCols - x) + Math.abs(Math.floor(j / navCols) - y) === 1);
        if (!neighbors.length)
            break;
        const next = neighbors.sort((a, b) => cost[a] - cost[b] || distance({ x: a % navCols * navSize + navSize/2, y: Math.floor(a / navCols) * navSize + navSize/2 }, target) - distance({ x: b % navCols * navSize + navSize/2, y: Math.floor(b / navCols) * navSize + navSize/2 }, target))[0], candidate = { x: next % navCols * navSize + navSize/2, y: Math.floor(next / navCols) * navSize + navSize/2 };
        if (!swept(start, candidate, state))
            break;
        i = next;
        to = candidate;
    }
    return { x: to.x - start.x, y: to.y - start.y };
}
export function pathLength(start: Vec, target: Vec, state?: MapState) {
    if (distance(start, target) < 45 && swept(start, target, state))
        return distance(start, target);
    const { cost } = flow(target, state), i = navStart(start, cost, state);
    return i < 0 ? Infinity : cost[i] * navSize + distance(start, { x: i % navCols * navSize + navSize/2, y: Math.floor(i / navCols) * navSize + navSize/2 });
}
export function lineOfSight(a: Vec, b: Vec, state?: MapState) {
    const d = distance(a, b), n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++)
        if (!walkable({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }, state, null, false, 0))
            return false;
    return true;
}

const geometryData=JSON.stringify({version:MAP_VERSION,floors,walls:wallSegments,connections:layoutGeometry.connections,colliders,gates:gateDefinitions,radius:PLAYER_RADIUS});
let geometryHash=2166136261;for(let i=0;i<geometryData.length;i++)geometryHash=Math.imul(geometryHash^geometryData.charCodeAt(i),16777619);
export const MAP_SIGNATURE=MAP_VERSION+':'+(geometryHash>>>0).toString(16);
