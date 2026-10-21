import { useRef, useEffect } from 'react';
import { WORLD, colliders, colliderIntersects, walkable, roomAt, center, doors, rooms, floors, obstacles, contains, distance, type Vec } from './world';
import { art, sprite, backSprite } from './data';
import type { State } from './engine';
import { material, equipmentSprite, signSprite, TEX } from './materials';
import { PresentationTimeline, defaultPresentation, cueProgress, ease, type PresentationSettings, type VisualCue } from './presentation';
import { FacilityAudio } from './audio';
type Focus = {
    id: string;
    position: Vec;
    label: string;
    kind: string;
};
type Thing = Vec & {
    key: string;
    image?: CanvasImageSource;
    pokemon?: number;
    label?: string;
    width: number;
    height: number;
    z?: number;
    alpha?: number;
    accent?: string;
    state?: string;
    threat?: string;
    facing?: Vec;
    fan?: boolean;
};
const pictures = new Map<string, HTMLImageElement>();
const litSprites = new Map<string, HTMLCanvasElement>();
function litSprite(image: HTMLImageElement, light: number) { const level = Math.max(0, Math.min(3, Math.floor(light * 4))), key = image.src + ':' + level; if (litSprites.has(key))
    return litSprites.get(key)!; const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96; const c = canvas.getContext('2d')!; c.imageSmoothingEnabled = false; c.drawImage(image, 0, 0, 96, 96);
    try{const pixels=c.getImageData(0,0,96,96).data;let minX=96,minY=96,maxX=-1,maxY=-1;for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(pixels[(y*96+x)*4+3]>12){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(maxX>=minX){const bw=maxX-minX+1,bh=maxY-minY+1,scale=94/Math.max(bw,bh),dw=bw*scale,dh=bh*scale;c.clearRect(0,0,96,96);c.drawImage(image,minX/96*image.naturalWidth,minY/96*image.naturalHeight,bw/96*image.naturalWidth,bh/96*image.naturalHeight,(96-dw)/2,96-dh,dw,dh);}}catch{/* A remote image that disallows pixel access keeps its safe original frame. */}
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(13,25,15,${.38 - level * .09})`; c.fillRect(0, 0, 96, 96); if (litSprites.size > 64)
    litSprites.delete(litSprites.keys().next().value!); litSprites.set(key, canvas); return canvas; }
let avatar: HTMLCanvasElement | undefined;
function trainerSprite() { if (!avatar) {
    avatar = document.createElement('canvas');
    avatar.width = 128;
    avatar.height = 160;
    drawTrainer(avatar.getContext('2d')!, 64, 0, 110, 160);
} return avatar; }
function picture(id: number, back = false) { const key = id + ':' + back; if (!pictures.has(key)) {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = back ? backSprite(id) : sprite(id);
    image.onerror = () => { if (image.dataset.fallback === '2')
        return; if (image.dataset.fallback) {
        image.dataset.fallback = '2';
        image.src = art(id);
    }
    else {
        image.dataset.fallback = '1';
        image.src = back ? sprite(id) : art(id);
    } };
    if (pictures.size >= 64)
        pictures.delete(pictures.keys().next().value!);
    pictures.set(key, image);
} return pictures.get(key)!; }
const normalize = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const solidColor = (value: number) => Math.max(0, Math.min(255, value)) | 0;
const lightCols=Math.ceil(WORLD.w/20),lightRows=Math.ceil(WORLD.h/20),bakedLight=new Float32Array(lightCols*lightRows);
for(let y=0;y<lightRows;y++)for(let x=0;x<lightCols;x++){let value=0;for(const r of rooms){const d=(x*20+10-r.x-r.w/2)**2+(y*20+10-r.y-75)**2;if(d<430*430)value+=1/(1+d/6500);}bakedLight[y*lightCols+x]=value;}
export default function FirstPerson({ state, role, yaw, flashlight, reduced, onLook, onLock, settings = defaultPresentation, focus }: {
    state: State;
    role: 'A' | 'B';
    yaw: number;
    flashlight: boolean;
    reduced: boolean;
    onLook: (dx: number, dy: number) => void;
    onLock: (locked: boolean) => void;
    settings?: PresentationSettings;
    focus?: Focus;
}) {
    const ref = useRef<HTMLCanvasElement>(null), latest = useRef({ state, yaw, flashlight, reduced, onLook, onLock, settings, focus });
    latest.current = { state, yaw, flashlight, reduced, onLook, onLock, settings, focus };
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d', { alpha: false })!, audio = new FacilityAudio(), timeline = new PresentationTimeline(), floorCanvas = document.createElement('canvas'), floorContext = floorCanvas.getContext('2d')!;
        let frame = 0, last = performance.now(), signature = '', width = 0, height = 0, floorImage: ImageData, grid = new Uint8Array(1), depth = new Float32Array(1), visual = { ...latest.current.state.players[role].position }, lastPosition = { ...visual }, walkPhase = 0, walkAmount = 0, stepDistance = 0, toolRaise = 1, powerLight = 1, lastLight = latest.current.flashlight, frameTime = 0, samples = 0, reportAt = 0;
        const cell = 5, cols = Math.ceil(WORLD.w / cell), rowCount = Math.ceil(WORLD.h / cell), doorAnimation = new Map<string, number>();
        const baseGrid=new Uint8Array(cols*rowCount);
        for(let gy=0;gy<rowCount;gy++)for(let gx=0;gx<cols;gx++){const point={x:gx*cell+cell/2,y:gy*cell+cell/2};baseGrid[gy*cols+gx]=colliders.some(o=>colliderIntersects(o,point,0))?2:floors.some(f=>contains(f,point))?0:1;}
        const concrete = material('floor'), grate = material('grate'), ceiling = material('ceiling'), walls = Array.from({ length: 4 }, (_, i) => material('wall', i)), cabinet = material('cabinet'), doorTexture = material('door');
        const unlock = () => { void audio.unlock(latest.current.settings); };
        const unlockSettings = (e: Event) => { void audio.unlock((e as CustomEvent<PresentationSettings>).detail); };
        const look = (e: MouseEvent) => { if (document.pointerLockElement === canvas)
            latest.current.onLook(Math.max(-1200, Math.min(1200, e.movementX)), e.movementY); };
        const lock = () => { latest.current.onLock(document.pointerLockElement === canvas); };
        const blur = () => audio.configure(latest.current.settings, false), visible = () => audio.configure(latest.current.settings, !document.hidden && document.hasFocus());
        const intent = () => { const p = latest.current.state.players[role]; audio.play('submitted', p.position, p.position, latest.current.yaw); timeline.push('submitted', latest.current.state.players[role].position, 'Transmitting', performance.now()); };
        document.addEventListener('mousemove', look);
        document.addEventListener('pointerlockchange', lock);
        document.addEventListener('pointerdown', unlock);
        document.addEventListener('keydown', unlock);
        window.addEventListener('blur', blur);
        window.addEventListener('focus', visible);
        document.addEventListener('visibilitychange', visible);
        window.addEventListener('ghost-intent', intent);
        window.addEventListener('ghost-audio-unlock', unlockSettings);
        const paint = (now: number) => {
            const begin = performance.now(), { state: s, yaw, flashlight, reduced, settings: options, focus } = latest.current, p = s.players[role], dt = Math.min(.06, (now - last) / 1000);
            last = now;
            const maxWidth = { low: 480, standard: 720, high: 960 }[options.quality] || 720, bounds = canvas.getBoundingClientRect(), nextWidth = Math.round(Math.min(maxWidth, bounds.width) / 2) * 2, nextHeight = Math.max(180, Math.round(nextWidth * bounds.height / Math.max(1, bounds.width) / 2) * 2);
            if (nextWidth !== width || nextHeight !== height) {
                width = Math.max(320, nextWidth);
                height = nextHeight;
                canvas.width = width;
                canvas.height = height;
                floorCanvas.width = Math.ceil(width / 2);
                floorCanvas.height = Math.ceil(height / 2);
                floorImage = floorContext.createImageData(floorCanvas.width, floorCanvas.height);
                depth = new Float32Array(width);
            }
            ctx.imageSmoothingEnabled = false;
            const active = s.phase === 'playing' && !s.paused;
            if (lastLight !== flashlight) {
                audio.play('switch', p.position, p.position, yaw);
                lastLight = flashlight;
            }
            audio.configure(options, active && !document.hidden && document.hasFocus());
            const added = timeline.observe(s, role, now);
            for (const cue of added) {
                audio.play(cue.kind, cue.position, p.position, yaw, p.room === 'corridor' ? 'metal' : p.room === 'medical' ? 'rubber' : 'concrete');
                if (!['step', 'materialize', 'emergency'].includes(cue.kind))
                    window.dispatchEvent(new CustomEvent('ghost-feedback', { detail: cue }));
            }
            const transient = timeline.active(now), snap = distance(visual, p.position) > 160 ? 1 : 1 - Math.exp(-30 * dt);
            visual = { x: mix(visual.x, p.position.x, snap), y: mix(visual.y, p.position.y, snap) };
            const travel = distance(lastPosition, p.position);
            lastPosition = { ...p.position };
            walkAmount = mix(walkAmount, active && travel > .15 ? 1 : 0, 1 - Math.exp(-18 * dt));
            if (active && travel < 40) {
                stepDistance += travel;
                if (stepDistance > 70) {
                    stepDistance %= 70;
                    audio.play('step', p.position, p.position, yaw, ['medical', 'comms'].includes(p.room) ? 'rubber' : 'metal');
                }
            }
            walkPhase += dt * 8 * walkAmount;
            const currentDoors=doors(s),key=currentDoors.map(d=>d.id+':'+d.locked).join();
            if(key!==signature){signature=key;grid=baseGrid.slice();for(const d of currentDoors.filter(d=>d.locked)){for(let gy=Math.floor(d.y/cell);gy<Math.ceil((d.y+d.h)/cell);gy++)for(let gx=Math.floor(d.x/cell);gx<Math.ceil((d.x+d.w)/cell);gx++){if(contains(d,{x:gx*cell+cell/2,y:gy*cell+cell/2}))grid[gy*cols+gx]=3;}}}
            for (const d of currentDoors) {
                const old = doorAnimation.get(d.id);
                if (old !== undefined && Math.abs(old - Number(d.locked)) > .95)
                    audio.play('door', d, p.position, yaw);
                doorAnimation.set(d.id, mix(old ?? Number(d.locked), Number(d.locked), 1 - Math.exp(-10 * dt)));
            }
            const black = s.emergencies.some(e => e.status === 'active' && e.kind === 'blackout' && ['both', 'either', role].includes(e.scope)), alarm = s.emergencies.some(e => e.status === 'active' && ['reactor', 'overload', 'leak'].includes(e.kind)), nearThreats = s.threats.filter(t => t.status === 'active' && s.worldTime >= t.activeAt && !t.disabledEffect && distance(t.position, p.position) < 220), fog = nearThreats.some(t => t.behavior === 'fog'), frost = nearThreats.some(t => t.behavior === 'frost'), nightmare = nearThreats.some(t => t.behavior === 'fatigue'), interference = nearThreats.some(t => t.behavior === 'interference'), bob = reduced ? 0 : Math.sin(walkPhase * 2) * 1.3 * walkAmount, horizon = height * .49 + bob, fov = Math.PI * .39, projection = width / (2 * Math.tan(fov / 2)), eye = 42, wallHeight = 108, maximum = fog ? 300 : 900;
            const cos = Math.cos(yaw), sin = Math.sin(yaw), planeX = -sin * Math.tan(fov / 2), planeY = cos * Math.tan(fov / 2), lamps = rooms.map(r => ({ x: r.x + r.w / 2, y: r.y + 75, id: r.id })).filter(l => distance(l, visual) < 430).sort((a, b) => distance(a, visual) - distance(b, visual)).slice(0, 4);
            powerLight = mix(powerLight, black ? 0 : 1, 1 - Math.exp(-6 * dt));
            const spectral = nearThreats.find(t => t.behavior === 'drain');
            const illumination = (x: number, y: number, d: number, angle = 0) => { let value = mix(.23, .32, powerLight); if (spectral)
                value += .28 / (1 + ((x - spectral.position.x) ** 2 + (y - spectral.position.y) ** 2) / 3500); for (const lamp of lamps) {
                const square = (x - lamp.x) ** 2 + (y - lamp.y) ** 2;
                value += (mix(.13, .52, powerLight) / (1 + square / 6500));
            } if (flashlight)
                value += .67 * Math.max(0, 1 - Math.abs(angle) / .62) / (1 + d * d / 70000); return Math.max(.19, Math.min(1.05, value)) * (.6 + .4 * Math.max(0, 1 - d / 1100)); };
            const fw = floorCanvas.width, fh = floorCanvas.height, data = floorImage!.data;
            for (let y = 0; y < fh; y++) {
                const sy = y * 2 + 1, lower = sy > horizon, vertical = Math.max(1, Math.abs(sy - horizon)), rowDistance = (lower ? eye : wallHeight - eye) * projection / vertical, rayX = cos - planeX, rayY = sin - planeY, stepX = rowDistance * planeX * 2 / fw, stepY = rowDistance * planeY * 2 / fw;
                const rowFlash=flashlight?.67/(1+rowDistance*rowDistance/70000):0,rowFog=.6+.4*Math.max(0,1-rowDistance/1100);let wx = visual.x + rayX * rowDistance, wy = visual.y + rayY * rowDistance;
                for (let x = 0; x < fw; x++, wx += stepX, wy += stepY) {
                    const index = (y * fw + x) * 4, tx = ((Math.floor(wx * 1.8) % TEX) + TEX) % TEX, ty = ((Math.floor(wy * 1.8) % TEX) + TEX) % TEX, texture = lower ? (roomAtFast(wx, wy) ? concrete : grate) : ceiling, source = (ty * TEX + tx) * 4;
                    const lx=Math.floor(wx/20),ly=Math.floor(wy/20),field=lx>=0&&ly>=0&&lx<lightCols&&ly<lightRows?bakedLight[ly*lightCols+lx]:0;let light=Math.min(1.05,mix(.23,.32,powerLight)+mix(.13,.52,powerLight)*field+rowFlash*Math.max(0,1-Math.abs((x/fw-.5)*fov)/.62))*rowFog;if(spectral)light=Math.min(1.05,light+.28/(1+((wx-spectral.position.x)**2+(wy-spectral.position.y)**2)/3500));let r = texture.pixels[source] * light, g = texture.pixels[source + 1] * light, b = texture.pixels[source + 2] * light;
                    if (!lower && ((wx-144)%300+300)%300<52 && ((wy-131)%260+260)%260<8) {
                        r = black ? 125 : 206;
                        g = black ? 72 : 204;
                        b = black ? 36 : 164;
                    }
                    if (alarm) {
                        r *= 1.13;
                        g *= .91;
                        b *= .83;
                    }
                    data[index] = solidColor(r);
                    data[index + 1] = solidColor(g);
                    data[index + 2] = solidColor(b);
                    data[index + 3] = 255;
                }
            }
            floorContext.putImageData(floorImage!, 0, 0);
            ctx.drawImage(floorCanvas, 0, 0, width, height);
            for (let x = 0; x < width; x += 2) {
                const camera = (x / width * 2 - 1), dx = cos + planeX * camera, dy = sin + planeY * camera;
                let gx = Math.floor(visual.x / cell), gy = Math.floor(visual.y / cell), tx = dx < 0 ? (visual.x - gx * cell) / -dx : ((gx + 1) * cell - visual.x) / dx, ty = dy < 0 ? (visual.y - gy * cell) / -dy : ((gy + 1) * cell - visual.y) / dy, hit = maximum, side = 0, code = 1;
                const incX = cell / Math.max(.00001, Math.abs(dx)), incY = cell / Math.max(.00001, Math.abs(dy));
                for (let i = 0; i < 420; i++) {
                    if (tx < ty) {
                        hit = tx;
                        tx += incX;
                        gx += dx < 0 ? -1 : 1;
                        side = 0;
                    }
                    else {
                        hit = ty;
                        ty += incY;
                        gy += dy < 0 ? -1 : 1;
                        side = 1;
                    }
                    if (hit > maximum)
                        break;
                    if (gx < 0 || gy < 0 || gx >= cols || gy >= rowCount)
                        break;
                    code = grid[gy * cols + gx];
                    if(code===3){const gate=currentDoors.find(d=>contains(d,{x:gx*cell+cell/2,y:gy*cell+cell/2}));if(gate&&(doorAnimation.get(gate.id)??1)<.98)code=0;}
                    if (code)
                        break;
                }
                const d = Math.max(3, hit), wx = visual.x + dx * d, wy = visual.y + dy * d, top = horizon - (wallHeight - eye) * projection / d, bottom = horizon + eye * projection / d, texture = code === 2 ? cabinet : code === 3 ? doorTexture : walls[Math.abs(Math.floor(wx / 300) + Math.floor(wy / 260)) % 4], u = Math.floor(((side ? wx : wy) * 1.4 % TEX + TEX) % TEX), light = illumination(wx, wy, d, camera * fov / 2) * (side ? .83 : 1);
                depth[x] = depth[Math.min(width - 1, x + 1)] = d;
                ctx.drawImage(texture.canvas, u, 0, 1, TEX, x, top, 2, bottom - top);
                ctx.fillStyle = `rgba(4,12,9,${Math.max(0, 1 - light)})`;
                ctx.fillRect(x, top, 2, bottom - top);
                if (alarm) {
                    ctx.fillStyle = 'rgba(124,45,22,.07)';
                    ctx.fillRect(x, top, 2, bottom - top);
                }
                if (code === 3) {
                    ctx.fillStyle = '#d7b16b';
                    ctx.fillRect(x, top + (bottom - top) * .29, 2, Math.max(1, (bottom - top) * .016));
                }
            }
            const project = (v: Vec, z = 0) => { const vx = v.x - visual.x, vy = v.y - visual.y, d = vx * cos + vy * sin, lateral = -vx * sin + vy * cos; return { x: width / 2 + lateral * projection / Math.max(1, d), y: horizon + (eye - z) * projection / Math.max(1, d), d }; };
            const things: Thing[] = [];
            for (let index = 0; index < rooms.length; index++) {
                const r = rooms[index];
                if (distance(center(r.id), visual) > 640)
                    continue;
                const accent = ['#c6b577', '#9dab86', '#a5babb', '#beac8b'][index % 4];
                things.push({ key: r.id + 'sign', x: r.x + r.w - 12, y: r.y + 55, z: 64, width: 55, height: 15, image: signSprite(r.name, `${String(index + 1).padStart(2, '0')} / ${r.sub}`, accent) });
                const wallEquipment:Record<string,string>={comms:'radio',medical:'medical',archive:'crate',security:'security',workshop:'tools',storage:'crate'};const fixture=wallEquipment[r.id]||'fan';things.push({key:r.id+'fixture',x:r.x+24,y:r.y+49,z:fixture==='crate'?22:48,width:fixture==='crate'?34:28,height:fixture==='crate'?42:35,image:equipmentSprite(fixture,accent),fan:fixture==='fan'});
                if(!['medical','comms','archive','security'].includes(r.id))things.push({ key: r.id + 'pipe', x: r.x + r.w - 18, y: r.y + r.h - 45, z: 0, width: 12, height: 76, image: equipmentSprite('pipe') });
                if (['reactor', 'containment', 'medical'].includes(r.id))
                    things.push({ key: r.id + 'pod', x: r.x + 36, y: r.y + 41, width: 36, height: 68, image: equipmentSprite('pod', accent) });
                for (const [offset, x, y] of [[1, r.x + r.w - 20, r.y + 90], [-1, r.x + 20, r.y + 90], [4, r.x + 110, r.y + r.h - 20], [-4, r.x + 110, r.y + 20]]) {
                    const next = rooms[index + offset];
                    if (next && (Math.abs(offset) !== 1 || Math.floor(index / 4) === Math.floor((index + offset) / 4)))
                        things.push({ key: r.id + 'route' + offset, x, y, z: 66, width: 41, height: 11, image: signSprite(next.name, 'ACCESS / ' + String(index + offset + 1).padStart(2, '0'), accent) });
                }
            }
            for (const t of s.tasks) {
                if (t.complete && distance(t.position, visual) > 200)
                    continue;
                const point = t.mode === 'cooperative' && role === 'B' ? t.secondPosition! : t.mode === 'transfer' && t.carrier ? t.destination! : t.position;
                things.push({ ...point, key: t.id, width: 33, height: 48, image: equipmentSprite('console', t.complete ? '#7cac88' : '#d5ba74', t.kind), label: t.name, accent: t.complete ? '#7cac88' : '#dbc38a' });
            }
            for (const e of s.emergencies.filter(e => e.status === 'active')) {
                const point = e.kind === 'corruption' && e.carrier ? e.destination! : role === 'B' && e.secondPosition ? e.secondPosition : e.position;
                things.push({ ...point, key: e.id, width: 35, height: 51, image: equipmentSprite('console', '#db9c6e', e.kind), label: e.name, accent: '#dfad77' });
            }
            for (const t of s.threats) {
                const resolution = transient.find(c => c.kind === 'resolved' && distance(c.position, t.position) < 2);
                if (t.status !== 'active' && !resolution)
                    continue;
                const alpha = t.status === 'active' ? ease((s.worldTime - t.activeAt + 3) / 3) : 1 - cueProgress(resolution!, now);
                things.push({ ...t.position, key: t.instanceId, pokemon: t.id, width: t.id === 92 ? 36 : 52, height: t.id === 92 ? 36 : 52, alpha, label: t.name, accent: t.behavior === 'drain' ? '#ecc27e' : t.behavior === 'frost' ? '#a9d7df' : '#b6a0ce', threat: t.behavior });
                if (['illusion', 'decoy'].includes(t.behavior) && !t.revealed)
                    things.push({ x: t.position.x + 42, y: t.position.y + 20, key: t.instanceId + 'decoy', pokemon: t.id, width: 44, height: 44, alpha: .22, accent: '#a899b8' });
            }
            for (const r of ['A', 'B'] as const) {
                const q = s.players[r];
                if (q.selected && q.follower.x > 0) {
                    const assigned = q.team[q.selected]?.state === 'Assigned', point = assigned ? { x: q.position.x + q.facing.x * 48, y: q.position.y + q.facing.y * 48 } : q.follower;
                    things.push({ ...point, key: r + 'companion', pokemon: q.selected, width: 31, height: 31, accent: r === 'A' ? '#b5c59a' : '#b9afca', state: q.team[q.selected]?.state, facing: q.facing, label: q.team[q.selected]?.record?.name });
                }
                if (r !== role && q.position.x > 0 && distance(q.position, visual) > 65)
                    things.push({ ...q.position, key: r + 'trainer', width: 31, height: 72, state: 'trainer', image: trainerSprite(), accent: '#b8b8a0', label: 'TRAINER ' + r });
            }
            things.sort((a, b) => distance(b, visual) - distance(a, visual));
            for (const item of things) {
                const point = project(item, item.z ?? 0);
                if (point.d < 14 || point.d > maximum || point.x < -width * .4 || point.x > width * 1.4)
                    continue;
                const scale = projection / point.d, w = item.width * scale, h = item.height * scale, idle = reduced ? 0 : Math.sin(now * .0018 + item.x) * Math.min(1.2, scale * .2), bottom = point.y, top = bottom - h + idle, left = point.x - w / 2;
                let img: CanvasImageSource | undefined = item.image;
                if (item.pokemon) {
                    const back = !!item.facing && ((visual.x - item.x) * item.facing.x + (visual.y - item.y) * item.facing.y) < -8;
                    let image = picture(item.pokemon, back);
                    if ((!image.complete || !image.naturalWidth) && back)
                        image = picture(item.pokemon, false);
                    if (image.complete && image.naturalWidth)
                        img = litSprite(image, illumination(item.x, item.y, point.d));
                }
                const centerVisible = point.x >= 0 && point.x < width && point.d <= depth[Math.floor(point.x)] + 4, progress = item.alpha ?? 1;
                ctx.globalAlpha = progress;
                if (centerVisible && (item.pokemon || item.state === 'trainer')) {
                    ctx.fillStyle = '#00000070';
                    ctx.beginPath();
                    ctx.ellipse(point.x, bottom - 1, w * .34, Math.max(2, w * .065), 0, 0, 7);
                    ctx.fill();
                }
                const light = illumination(item.x, item.y, point.d);
                const guard = s.threats.some(t => t.status === 'active' && t.guardUntil > s.worldTime && distance(t.position, item) < 150);
                if (centerVisible && item.pokemon && (item.state === 'Assigned' || item.state === 'Recovering' || guard)) {
                    ctx.strokeStyle = item.state === 'Recovering' ? '#87b5a3' : guard ? '#c9c998' : '#d4b47f';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(point.x, bottom, w * .48, w * .12, 0, 0, 7);
                    ctx.stroke();
                }
                if (img) {
                    const iw = 'naturalWidth' in img ? (img as HTMLImageElement).naturalWidth : (img as HTMLCanvasElement).width, ih = 'naturalHeight' in img ? (img as HTMLImageElement).naturalHeight : (img as HTMLCanvasElement).height;
                    for (let x = Math.max(0, Math.floor(left)); x < Math.min(width, left + w); x += 2) {
                        if (point.d > depth[x] + 4)
                            continue;
                        if (progress < 1 && ((x * 17 + Math.floor(now * .015)) % 29) / 29 > progress)
                            continue;
                        const u = (x - left) / w;
                        ctx.drawImage(img, u * iw, 0, Math.max(.5, iw * 2 / w), ih, x, top, 2, h);
                    }
                }
                else if (item.pokemon && centerVisible) {
                    ctx.fillStyle = item.accent || '#a9b2a1';
                    ctx.beginPath();
                    ctx.ellipse(point.x, top + h * .6, w * .24, h * .34, 0, 0, 7);
                    ctx.fill();
                    ctx.font = '8px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('#' + item.pokemon, point.x, top + h * .55);
                }
                if (centerVisible && item.fan && !reduced && point.d < 250) {
                    ctx.save();
                    ctx.translate(point.x, top + h * .43);
                    ctx.rotate(now * .002);
                    ctx.strokeStyle = '#c0c3aa60';
                    ctx.lineWidth = Math.max(1, w * .03);
                    ctx.beginPath();
                    ctx.moveTo(-w * .18, 0);
                    ctx.lineTo(w * .18, 0);
                    ctx.moveTo(0, -w * .18);
                    ctx.lineTo(0, w * .18);
                    ctx.stroke();
                    ctx.restore();
                }
                if (centerVisible && item.threat && point.d < 300) {
                    const materializing = progress < 1;
                    ctx.strokeStyle = item.accent || '#b09ac4';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(point.x, bottom, w * (materializing ? .65 : .4), w * .12, 0, 0, 7);
                    ctx.stroke();
                    if (materializing) {
                        for (let i = 0; i < 10; i++) {
                            const angle = i * 2.4 + now * .001, rx = point.x + Math.sin(angle) * w * .5, ry = bottom - (i / 10) * h;
                            ctx.fillStyle = '#c3b2cd70';
                            ctx.fillRect(rx, ry, 2, 4);
                        }
                    }
                    if (item.threat === 'interference' && !options.reducedFlashes) {
                        ctx.strokeStyle = '#dacd8a';
                        ctx.beginPath();
                        ctx.moveTo(point.x - w * .4, top + h * .6);
                        ctx.lineTo(point.x, top + h * .35);
                        ctx.lineTo(point.x - w * .1, top + h * .55);
                        ctx.lineTo(point.x + w * .4, top + h * .3);
                        ctx.stroke();
                    }
                }
                if (centerVisible && focus && item.key === focus.id && point.d < 150) {
                    ctx.strokeStyle = '#e1d8ad';
                    ctx.lineWidth = 1;
                    const gap = 7, len = 7;
                    for (const [x, y, sx, sy] of [[left - gap, top - gap, 1, 1], [left + w + gap, top - gap, -1, 1], [left - gap, bottom + gap, 1, -1], [left + w + gap, bottom + gap, -1, -1]]) {
                        ctx.beginPath();
                        ctx.moveTo(x + len * sx, y);
                        ctx.lineTo(x, y);
                        ctx.lineTo(x, y + len * sy);
                        ctx.stroke();
                    }
                }
                ctx.globalAlpha = 1;
            }
            for (const cue of transient) {
                const point = project(cue.position), t = cueProgress(cue, now);
                if (point.d < 15 || point.d > 600 || point.x < 0 || point.x >= width || point.d > depth[Math.max(0, Math.min(width - 1, Math.floor(point.x)))] + 25)
                    continue;
                const radius = projection / point.d * 18;
                ctx.save();
                ctx.globalAlpha = 1 - t;
                if (cue.kind === 'guard') {
                    ctx.strokeStyle = '#c6d4b1';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y - radius * 1.5, radius, -Math.PI * .85, -Math.PI * .15);
                    ctx.stroke();
                }
                else if (cue.kind === 'contain' || cue.kind === 'resolved') {
                    ctx.strokeStyle = '#c6b9dc';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(point.x, point.y - radius * t * 2, radius * (.5 + t), radius * .23, 0, 0, 7);
                    ctx.stroke();
                }
                else if (['task-success', 'switch', 'task-error'].includes(cue.kind)) {
                    ctx.fillStyle = cue.kind === 'task-error' ? '#dca078' : '#bfd4a0';
                    ctx.fillRect(point.x - radius * .6, point.y - radius * 1.6, radius * 1.2, 3);
                }
                else if (cue.kind === 'impact') {
                    ctx.strokeStyle = '#edc78c';
                    for (let i = 0; i < 6; i++) {
                        const angle = i * Math.PI / 3;
                        ctx.beginPath();
                        ctx.moveTo(point.x + Math.cos(angle) * radius * t, point.y - radius * 1.5 + Math.sin(angle) * radius * t);
                        ctx.lineTo(point.x + Math.cos(angle) * radius * (t + .4), point.y - radius * 1.5 + Math.sin(angle) * radius * (t + .4));
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }
            // Sliding panels remain cosmetic; the current authoritative door state owns collision.
            for (const d of currentDoors) {
                const fraction = doorAnimation.get(d.id) ?? Number(d.locked);
                if ((d.locked&&fraction>=.98) || fraction < .015)
                    continue;
                const v = { x: d.x + d.w / 2, y: d.y + d.h / 2 }, point = project(v);
                if (point.d < 18 || point.d > 400 || point.x < 0 || point.x > width)
                    continue;
                const w = 60 * projection / point.d, h = 108 * projection / point.d, top = point.y - h;
                for (let x = Math.max(0, Math.floor(point.x - w / 2)); x < Math.min(width, point.x + w / 2); x += 2) {
                    if (point.d > depth[x] + 4)
                        continue;
                    ctx.drawImage(doorTexture.canvas, (x - point.x + w / 2) / w * TEX, 0, Math.max(.5, TEX * 2 / w), TEX * fraction, x, top, 2, h * fraction);
                }
            }
            if (fog) {
                const haze = ctx.createRadialGradient(width * .5, height * .5, 10, width * .5, height * .5, width * .7);
                haze.addColorStop(0, '#b4adbb08');
                haze.addColorStop(1, '#aaa3ae60');
                ctx.fillStyle = haze;
                ctx.fillRect(0, 0, width, height);
            }
            if (frost) {
                ctx.strokeStyle = '#9dc8cd75';
                for (let i = 0; i < 12; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * width / 12, height);
                    ctx.lineTo(i * width / 12 + 12, height - 12 - (i % 3) * 8);
                    ctx.stroke();
                }
            }
            if (nightmare && options.postProcessing) {
                ctx.fillStyle = '#2e163220';
                ctx.fillRect(0, 0, width, height);
            }
            const vignette = ctx.createRadialGradient(width * .5, height * .47, height * .16, width * .5, height * .5, width * .66);
            vignette.addColorStop(0, '#00000000');
            vignette.addColorStop(1, black ? '#030806b0' : '#03080685');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);
            if (options.postProcessing) {
                ctx.fillStyle = '#0c120b0b';
                for (let y = 0; y < height; y += 3)
                    ctx.fillRect(0, y, width, 1);
            }
            const activeCue = transient.filter(c => ['contain', 'attack', 'guard', 'selection', 'submitted', 'switch'].includes(c.kind)).at(-1), pulse = activeCue ? Math.sin(cueProgress(activeCue, now) * Math.PI) : 0;
            toolRaise = mix(toolRaise, flashlight ? 1 : .55, 1 - Math.exp(-12 * dt));
            drawTool(ctx, width, height, reduced ? 0 : Math.sin(walkPhase) * 3 * walkAmount, toolRaise, pulse, Math.max(0, 1 - depth[Math.floor(width / 2)] / 65), s.players[role].selected, activeCue?.kind);
            ctx.strokeStyle = focus ? '#e5ddba' : '#c1c5ad88';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(width / 2 - 3, horizon);
            ctx.lineTo(width / 2 + 3, horizon);
            ctx.moveTo(width / 2, horizon - 3);
            ctx.lineTo(width / 2, horizon + 3);
            ctx.stroke();
            frameTime += performance.now() - begin;
            samples++;
            if (now - reportAt > 1000) {
                canvas.dataset.frameMs = (frameTime / samples).toFixed(2);
                canvas.dataset.renderResolution = width + 'x' + height;
                canvas.dataset.audio = audio.ready ? 'running' : 'locked-or-muted';
                frameTime = 0;
                samples = 0;
                reportAt = now;
            }
            frame = requestAnimationFrame(paint);
        };
        frame = requestAnimationFrame(paint);
        return () => { cancelAnimationFrame(frame); audio.dispose(); document.removeEventListener('mousemove', look); document.removeEventListener('pointerlockchange', lock); document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); window.removeEventListener('blur', blur); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); window.removeEventListener('ghost-intent', intent); window.removeEventListener('ghost-audio-unlock', unlockSettings); };
    }, [role]);
    return <canvas ref={ref} className="first-person" aria-label="First-person research facility" onClick={() => { if (matchMedia('(pointer:fine)').matches && document.pointerLockElement !== ref.current)
        void ref.current?.requestPointerLock().catch(() => { }); }}/>;
}
function roomAtFast(x: number, y: number) { const col = Math.floor((x - 60) / 300), row = Math.floor((y - 60) / 260); return col >= 0 && col < 4 && row >= 0 && row < 4 && x - 60 - col * 300 <= 220 && y - 60 - row * 260 <= 180; }
function drawTrainer(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { c.fillStyle = '#26342e'; c.fillRect(x - w * .3, y + h * .37, w * .6, h * .37); c.fillStyle = '#62705d'; c.fillRect(x - w * .37, y + h * .36, w * .14, h * .4); c.fillRect(x + w * .23, y + h * .36, w * .14, h * .4); c.fillStyle = '#26342c'; c.fillRect(x - w * .22, y + h * .72, w * .17, h * .28); c.fillRect(x + w * .05, y + h * .72, w * .17, h * .28); c.fillStyle = '#aaa88a'; c.fillRect(x - w * .22, y + h * .43, w * .44, h * .13); c.fillStyle = '#91a08a'; c.beginPath(); c.ellipse(x, y + h * .23, w * .27, h * .15, 0, 0, 7); c.fill(); c.fillStyle = '#152923'; c.fillRect(x - w * .25, y + h * .19, w * .5, h * .08); c.fillStyle = '#8ab6a1'; c.fillRect(x - w * .19, y + h * .21, w * .38, h * .025); c.fillStyle = '#a99c75'; c.fillRect(x - w * .26, y + h * .55, w * .52, h * .04); }
function drawTool(c: CanvasRenderingContext2D, w: number, h: number, sway: number, raise: number, pulse: number, near: number, id: number, kind?: string) { const scale = Math.min(w / 720, h / 430), x = w * .78 + sway, y = h + (1 - raise) * 45 * scale + near * 30 * scale + (kind === 'attack' ? -pulse * 14 : pulse * 4) * scale; c.save(); c.translate(x, y); c.scale(scale, scale); c.rotate(sway * .003); c.fillStyle = '#17211b'; c.beginPath(); c.moveTo(-36, 30); c.lineTo(-49, -26); c.lineTo(-26, -69); c.lineTo(14, -66); c.lineTo(49, 30); c.fill(); c.fillStyle = '#58604d'; c.beginPath(); c.moveTo(-30, 20); c.lineTo(-38, -18); c.lineTo(-21, -54); c.lineTo(6, -49); c.lineTo(29, 20); c.fill(); c.fillStyle = '#354538'; c.fillRect(-35, -108, 64, 82); c.fillStyle = '#8a8e71'; c.fillRect(-38, -111, 69, 9); c.fillStyle = '#202e25'; c.fillRect(-29, -94, 54, 40); c.fillStyle = kind === 'guard' ? '#c8cda1' : '#96b68c'; c.fillRect(-25, -90, 46, 28); c.fillStyle = '#314a32'; c.font = '7px monospace'; c.fillText('FIELD / ' + (id || '--'), -22, -79); c.fillText(kind === 'contain' ? 'CONTAIN' : kind === 'submitted' ? 'UPLINK' : 'SCAN READY', -22, -69); c.fillStyle = '#121d18'; c.fillRect(-20, -46, 10, 7); c.fillRect(6, -46, 10, 7); c.fillStyle = '#8d9378'; c.fillRect(28, -99, 28, 26); c.fillStyle = '#202e24'; c.beginPath(); c.ellipse(59, -86, 8, 16, 0, 0, 7); c.fill(); c.fillStyle = raise > .8 ? '#dfddae' : '#6c7460'; c.beginPath(); c.ellipse(60, -86, 4, 10, 0, 0, 7); c.fill(); if (kind === 'contain') {
    c.strokeStyle = '#b9a5d8';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(-5, -114, 10 + pulse * 7, 0, 7);
    c.stroke();
} c.restore(); }
