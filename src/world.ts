export type Vec = {
    x: number;
    y: number;
};
export type Rect = Vec & {
    w: number;
    h: number;
};
export type MapState = {
    worldTime?: number;
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
const names = [['arrival', 'Arrival', 'CREW CHECK-IN', '#83c9bb'], ['hub', 'Central Hub', 'ASTER RESEARCH', '#5db5da'], ['electrical', 'Electrical', 'POWER GRID', '#e6c75e'], ['comms', 'Communications', 'RELAY ARRAY', '#80c6e5'], ['medical', 'Medical Bay', 'COMPANION CARE', '#69ceb0'], ['reactor', 'Reactor', 'DUAL STABILIZERS', '#ef9768'], ['cooling', 'Cooling Station', 'COOLANT MANIFOLD', '#75c7ef'], ['containment', 'Containment Lab', 'FIELD RESEARCH', '#b19ae8'], ['archive', 'Research Archive', 'DATA VAULT', '#baa272'], ['security', 'Security', 'ACCESS CONTROL', '#748dd5'], ['storage', 'Storage', 'SUPPLY LOCKERS', '#c9a078'], ['workshop', 'Maintenance Workshop', 'SERVICE BENCH', '#d1b552'], ['west', 'West Service Corridor', 'WEST CONNECTOR', '#82a5b1'], ['emergency', 'Emergency Control', 'MANUAL OVERRIDE', '#d57878'], ['east', 'East Service Corridor', 'EAST CONNECTOR', '#82a5b1'], ['exit', 'Extraction Airlock', 'BOTH TRAINERS REQUIRED', '#7fe5bb']];
/** Original Aster wing layout, inspired by the supplied schematic's adjacency. */
export const MAP_VERSION = 'aster-wings-v5-spacious';
export const WORLD = { w: 1480, h: 1160 };
const layout: Record<string, [
    number,
    number,
    number,
    number
]> = {
    arrival: [200, 100, 200, 180], hub: [620, 60, 300, 240], containment: [1080, 120, 200, 180],
    medical: [440, 320, 180, 180], reactor: [40, 420, 180, 220], security: [280, 420, 140, 180],
    cooling: [1030, 390, 180, 170], east: [1280, 400, 160, 200], archive: [790, 400, 180, 180],
    electrical: [430, 650, 180, 180], storage: [680, 730, 260, 230], workshop: [220, 800, 180, 180],
    west: [80, 720, 120, 160], emergency: [1110, 710, 200, 180], comms: [970, 970, 200, 150], exit: [450, 950, 180, 160]
};
// Expand interiors into unused margins; centers and corridor lengths stay stable.
for (const id of Object.keys(layout)) {
 const r=layout[id], pad=['hub','storage'].includes(id)?15:['west','east'].includes(id)?10:20;
 layout[id]=[r[0]-pad,r[1]-pad,r[2]+pad*2,r[3]+pad*2];
}
export const rooms = names.map(([id, name, sub, color]) => { const [x, y, w, h] = layout[id]; return { x, y, w, h, id, name, sub, color }; });
export const center = (id: string): Vec => { const r = rooms.find(r => r.id === id)!; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
// Explicit corridors share the exact same rectangles in every consumer. Width 70-80, player radius 11.
export const corridors: Rect[] = [
    { x: 400, y: 170, w: 220, h: 70 }, { x: 490, y: 205, w: 70, h: 115 },
    { x: 920, y: 180, w: 160, h: 70 }, { x: 750, y: 300, w: 70, h: 100 }, { x: 780, y: 365, w: 150, h: 70 },
    { x: 620, y: 365, w: 130, h: 70 }, { x: 350, y: 280, w: 70, h: 140 }, { x: 130, y: 310, w: 220, h: 70 },
    { x: 130, y: 310, w: 70, h: 110 }, { x: 220, y: 490, w: 60, h: 70 },
    { x: 140, y: 640, w: 70, h: 80 }, { x: 165, y: 830, w: 55, h: 70 }, { x: 315, y: 600, w: 70, h: 200 },
    { x: 400, y: 850, w: 100, h: 70 }, { x: 465, y: 830, w: 70, h: 120 }, { x: 610, y: 760, w: 70, h: 70 },
    { x: 610, y: 940, w: 70, h: 90 }, { x: 880, y: 580, w: 70, h: 150 },
    { x: 1170, y: 300, w: 70, h: 90 }, { x: 1210, y: 460, w: 70, h: 70 },
    { x: 1320, y: 600, w: 70, h: 180 }, { x: 1310, y: 745, w: 80, h: 70 },
    { x: 940, y: 795, w: 170, h: 70 }, { x: 1000, y: 865, w: 70, h: 105 }, { x: 940, y: 995, w: 30, h: 70 },
    { x: 930, y: 525, w: 100, h: 70 }, { x: 995, y: 560, w: 70, h: 235 }
];
// Widen narrow service passages without extending travel.
for(const c of corridors){if(c.w<c.h&&c.w<90){c.x-=(90-c.w)/2;c.w=90;}else if(c.h<=c.w&&c.h<90){c.y-=(90-c.h)/2;c.h=90;}}
export const floors: Rect[] = [...rooms, ...corridors];
/** Room-edge intervals, cut by the actual floor union. Used for equipment and flush entrances. */
export type RoomEdge = {
    roomId: string;
    side: 'north' | 'south' | 'east' | 'west';
    start: Vec;
    normal: Vec;
    tangent: Vec;
    length: number;
};
const floorHit = (p: Vec) => floors.some(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
function boundaryIntervals(open: boolean): RoomEdge[] {
    const result: RoomEdge[] = [];
    for (const r of rooms)
        for (const side of ['north', 'south', 'west', 'east'] as const) {
            const horizontal = side === 'north' || side === 'south', length = horizontal ? r.w : r.h;
            const origin = { x: side === 'east' ? r.x + r.w : r.x, y: side === 'south' ? r.y + r.h : r.y };
            const tangent = horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }, normal = { x: side === 'west' ? 1 : side === 'east' ? -1 : 0, y: side === 'north' ? 1 : side === 'south' ? -1 : 0 };
            let start = -1;
            for (let step = 0; step <= length; step += 10) {
                const outside = { x: origin.x + tangent.x * (step + 5) - normal.x * 5, y: origin.y + tangent.y * (step + 5) - normal.y * 5 }, match = step < length && floorHit(outside) === open;
                if (match && start < 0)
                    start = step;
                if (!match && start >= 0) {
                    result.push({ roomId: r.id, side, start: { x: origin.x + tangent.x * start, y: origin.y + tangent.y * start }, normal, tangent, length: step - start });
                    start = -1;
                }
            }
        }
    return result;
}
export const roomWalls = boundaryIntervals(false);
const floorClear = (p: Vec) => [p, { x: p.x - 12, y: p.y }, { x: p.x + 12, y: p.y }, { x: p.x, y: p.y - 12 }, { x: p.x, y: p.y + 12 }].every(floorHit);
export const roomPortals = boundaryIntervals(true).filter(p => p.length >= 44 && [-20, 0, 20].every(offset => floorClear({ x: p.start.x + p.tangent.x * p.length / 2 + p.normal.x * offset, y: p.start.y + p.tangent.y * p.length / 2 + p.normal.y * offset })));
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
    const length = Math.min(plan.length, edge.length - 16), anchor = { x: edge.start.x + edge.tangent.x * edge.length / 2, y: edge.start.y + edge.tangent.y * edge.length / 2 }, normal = edge.normal, tangent = edge.tangent, depth = plan.depth;
    const corner = { x: anchor.x - tangent.x * length / 2, y: anchor.y - tangent.y * length / 2 }, other = { x: anchor.x + tangent.x * length / 2 + normal.x * depth, y: anchor.y + tangent.y * length / 2 + normal.y * depth };
    const bounds = { x: Math.min(corner.x, other.x), y: Math.min(corner.y, other.y), w: Math.abs(corner.x - other.x), h: Math.abs(corner.y - other.y) };
    const controls = [-30, 30].map(offset => ({ x: anchor.x + tangent.x * offset + normal.x * (depth + 32), y: anchor.y + tangent.y * offset + normal.y * (depth + 32) })) as [
        Vec,
        Vec
    ];
    return { roomId: r.id, kind: plan.kind, edge, anchor, normal, tangent, length, depth, bounds, controls };
});
export type Collider = {id:string;roomId:string} & ({shape:'box';x:number;y:number;w:number;h:number}|{shape:'circle';x:number;y:number;r:number});
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
export const obstacles:Rect[]=colliders.map(c=>c.shape==='box'?{x:c.x,y:c.y,w:c.w,h:c.h}:{x:c.x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2});
export const PLAYER_RADIUS=11;
export function colliderIntersects(c:Collider,p:Vec,radius=PLAYER_RADIUS){
 if(c.shape==='circle')return (p.x-c.x)**2+(p.y-c.y)**2<(radius+c.r)**2-1e-8;
 const dx=p.x-Math.max(c.x,Math.min(p.x,c.x+c.w)),dy=p.y-Math.max(c.y,Math.min(p.y,c.y+c.h));
 return radius===0?p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h:dx*dx+dy*dy<radius*radius-1e-8;
}
/** Exact boundary of the rectangle union, including 5-unit offsets; no renderer-only voxel rounding. */
export type WallSegment={x:number;z:number;length:number;axis:'x'|'z';normal:number};
const boundaryX=[...new Set(floors.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b),boundaryY=[...new Set(floors.flatMap(r=>[r.y,r.y+r.h]))].sort((a,b)=>a-b);
export const wallSegments:WallSegment[]=[];
for(const [axis,lines,spans] of [['x',boundaryY,boundaryX],['z',boundaryX,boundaryY]] as const)for(const line of lines)for(const normal of [-1,1]){
 let begin:number|undefined;
 for(let i=0;i<spans.length;i++){const start=spans[i],end=spans[i+1],mid=(start+end)/2;
  const negative=axis==='x'?{x:mid,y:line-.1}:{x:line-.1,y:mid},positive=axis==='x'?{x:mid,y:line+.1}:{x:line+.1,y:mid};
  const edge=end!==undefined&&(normal<0?floorHit(positive)&&!floorHit(negative):floorHit(negative)&&!floorHit(positive));
  if(edge&&begin===undefined)begin=start;if(!edge&&begin!==undefined){wallSegments.push({x:axis==='x'?begin:line,z:axis==='x'?line:begin,length:start-begin,axis,normal});begin=undefined;}
 }
}
export function wallDistanceSquared(p:Vec,e:WallSegment){const x=e.axis==='x'?Math.max(e.x,Math.min(p.x,e.x+e.length)):e.x,y=e.axis==='z'?Math.max(e.z,Math.min(p.y,e.z+e.length)):e.z;return (p.x-x)**2+(p.y-y)**2;}
export const controlPoint = (roomId: string, role: 'A' | 'B' = 'A'): Vec => ({ ...roomEquipment.find(e => e.roomId === roomId)!.controls[role === 'A' ? 0 : 1] });
export const gateDefinitions = [
    { id: 'hub-shortcut', x: 650, y: 365, w: 14, h: 70, unlock: 'access', name: 'Medical / central research shortcut' },
    { id: 'east-shortcut', x: 995, y: 630, w: 70, h: 14, unlock: 'containment', name: 'Eastern service bypass' }
];
export function doors(state?: MapState | number, _allocation?: string | null, _ready?: boolean) { const s = typeof state === 'object' ? state : {}; return gateDefinitions.map(d => ({ ...d, locked: !!s.threats?.some(t => t.status === 'active' && (s.worldTime ?? 0) >= t.activeAt && t.behavior === 'seal' && !t.disabledEffect && t.doorId === d.id) || !!s.emergencies?.some(e => e.status === 'active' && e.kind === 'lockdown' && e.doorId === d.id) || !!s.tasks?.some(t => t.unlock === d.unlock && !t.complete)&&!(d.id==='hub-shortcut'&&s.systems?.wingPower==='full') })); }
export const spawn = { A: { x: 265, y: 195 }, B: { x: 335, y: 195 } };
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
const navSize = 10, navCols = Math.ceil(WORLD.w / navSize), navRows = Math.ceil(WORLD.h / navSize);
const navBase = new Uint8Array(navCols * navRows);
for (let y = 0; y < navRows; y++)
    for (let x = 0; x < navCols; x++)
        navBase[y * navCols + x] = Number(walkable({ x: x * navSize + 5, y: y * navSize + 5 }, undefined, null, false, 12));
const flowCache = new Map<string, {
    cost: Int32Array;
    open: Uint8Array;
}>();
function flow(target: Vec, state?: MapState | number) {
    const locked = doors(state).filter(d => d.locked), key = Math.round(target.x / 10) + ',' + Math.round(target.y / 10) + '|' + locked.map(d => d.id).join();
    const cached = flowCache.get(key);
    if (cached)
        return cached;
    const open = navBase.slice();
    for (const d of locked)
        for (let y = Math.max(0, Math.floor((d.y - 13) / 10)); y < Math.min(navRows, Math.ceil((d.y + d.h + 13) / 10)); y++)
            for (let x = Math.max(0, Math.floor((d.x - 13) / 10)); x < Math.min(navCols, Math.ceil((d.x + d.w + 13) / 10)); x++)
                if (contains(d, { x: x * 10 + 5, y: y * 10 + 5 }, 12))
                    open[y * navCols + x] = 0;
    const cost = new Int32Array(open.length);
    cost.fill(-1);
    const queue = new Int32Array(open.length);
    let tail = 0, nearest = -1, best = Infinity;
    for (let y = Math.max(0, Math.floor(target.y / 10) - 5); y < Math.min(navRows, Math.floor(target.y / 10) + 6); y++)
        for (let x = Math.max(0, Math.floor(target.x / 10) - 5); x < Math.min(navCols, Math.floor(target.x / 10) + 6); x++) {
            const i = y * navCols + x, d = distance({ x: x * 10 + 5, y: y * 10 + 5 }, target);
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
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, j = ny * navCols + nx;
            if (nx < 0 || ny < 0 || nx >= navCols || ny >= navRows || !open[j] || cost[j] >= 0)
                continue;
            cost[j] = cost[i] + 1;
            queue[tail++] = j;
        }
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
    let result = -1, best = Infinity;
    const sx = Math.floor(start.x / 10), sy = Math.floor(start.y / 10);
    for (let y = sy - 2; y <= sy + 2; y++)
        for (let x = sx - 2; x <= sx + 2; x++) {
            const i = y * navCols + x;
            if (x < 0 || y < 0 || x >= navCols || y >= navRows || cost[i] < 0)
                continue;
            const p = { x: x * 10 + 5, y: y * 10 + 5 }, d = distance(start, p);
            const score = cost[i] * 10 + d;
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
    let to = { x: i % navCols * 10 + 5, y: Math.floor(i / navCols) * 10 + 5 };
    for (let step = 0; step < 4; step++) {
        const x = i % navCols, y = Math.floor(i / navCols), neighbors = [i - 1, i + 1, i - navCols, i + navCols].filter(j => j >= 0 && j < cost.length && cost[j] >= 0 && cost[j] < cost[i] && Math.abs(j % navCols - x) + Math.abs(Math.floor(j / navCols) - y) === 1);
        if (!neighbors.length)
            break;
        const next = neighbors.sort((a, b) => cost[a] - cost[b] || distance({ x: a % navCols * 10 + 5, y: Math.floor(a / navCols) * 10 + 5 }, target) - distance({ x: b % navCols * 10 + 5, y: Math.floor(b / navCols) * 10 + 5 }, target))[0], candidate = { x: next % navCols * 10 + 5, y: Math.floor(next / navCols) * 10 + 5 };
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
    return i < 0 ? Infinity : cost[i] * 10 + distance(start, { x: i % navCols * 10 + 5, y: Math.floor(i / navCols) * 10 + 5 });
}
export function lineOfSight(a: Vec, b: Vec, state?: MapState) {
    const d = distance(a, b), n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++)
        if (!walkable({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }, state, null, false, 0))
            return false;
    return true;
}

const geometryData=JSON.stringify({version:MAP_VERSION,floors,colliders,gates:gateDefinitions,radius:PLAYER_RADIUS});
let geometryHash=2166136261;for(let i=0;i<geometryData.length;i++)geometryHash=Math.imul(geometryHash^geometryData.charCodeAt(i),16777619);
export const MAP_SIGNATURE=MAP_VERSION+':'+(geometryHash>>>0).toString(16);
