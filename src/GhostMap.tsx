import {ROOM_IDENTITIES} from './roomIdentity';
import { useRef, useEffect } from 'react';
import { WORLD, MAP_SIGNATURE,rooms, floorTiles, wallSegments,colliders, doors, center, walkable, roomName, roomAt, type Vec } from './world';
import type { State } from './engine';
export default function GhostMap({ state, onPlace, placement }: {
    state: State;
    onPlace?: (p: Vec) => void;
    placement?: Vec;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas)
            return;
        const draw = () => {
            const c = canvas.getContext('2d')!, dpr = Math.min(devicePixelRatio, 2), w = canvas.clientWidth, h = canvas.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            c.scale(dpr, dpr);
            canvas.dataset.mapSignature=MAP_SIGNATURE;canvas.dataset.roomNames=JSON.stringify(rooms.map(r=>({id:r.id,name:r.name})));canvas.dataset.geometry=JSON.stringify({walls:wallSegments,floorTiles});
            const z = Math.min((w - 34) / WORLD.w, (h - 48) / WORLD.h), ox = (w - WORLD.w * z) / 2, oy = (h - WORLD.h * z) / 2 + 8;
            c.fillStyle = '#171218';
            c.fillRect(0, 0, w, h);
            c.strokeStyle = '#b6c49d08';
            for (let x = 0; x < w; x += 20) {
                c.beginPath();
                c.moveTo(x, 0);
                c.lineTo(x, h);
                c.stroke();
            }
            for (let y = 0; y < h; y += 20) {
                c.beginPath();
                c.moveTo(0, y);
                c.lineTo(w, y);
                c.stroke();
            }
            c.font = '11px monospace';
            c.fillStyle = '#b794a4';
            c.textAlign = 'left';
            c.fillText('ASTER / LIVE FACILITY', 14, 19);
            c.textAlign = 'right';
            c.fillText('A FIELD  /  B FIELD  /  ! INCIDENT', w - 14, h - 11);
            c.save();
            c.translate(ox, oy);
            c.scale(z, z);
            for (const corridor of floorTiles) {
                c.fillStyle = '#41373d';
                c.fillRect(corridor.x, corridor.y, corridor.w, corridor.h);

            }
            for (const [index, room] of rooms.entries()) {
                const occupied = Object.values(state.players).some(p => p.room === room.id);
                c.fillStyle = occupied ? '#61404b' : '#302a31';
                c.fillRect(room.x, room.y, room.w, room.h);

                c.fillStyle = '#81906c';
                c.font = `${7 / z}px monospace`;
                c.textAlign = 'left';
                c.fillText(String(index + 1).padStart(2, '0'), room.x + 10, room.y + 19);
                const lines=ROOM_IDENTITIES[room.id].short;
                c.fillStyle = '#f4e5ec';
                c.font = `${11 / z}px monospace`;
                c.textAlign = 'center';
                lines.forEach((line,i)=>{const text=line.toUpperCase(),width=c.measureText(text).width,y=room.y+(25+i*13)/z;c.fillStyle='#171017ee';c.fillRect(room.x+room.w/2-width/2-3/z,y-11/z,width+6/z,14/z);c.fillStyle='#f3e5ed';c.fillText(text,room.x+room.w/2,y,room.w-10);});
            }
            c.strokeStyle='#d2dbce';c.lineWidth=1.2/z;c.beginPath();for(const wall of wallSegments){c.moveTo(wall.x,wall.z);c.lineTo(wall.x+(wall.axis==='x'?wall.length:0),wall.z+(wall.axis==='z'?wall.length:0));}c.stroke();
            for (const obstacle of colliders) {
                c.fillStyle='#829174';if(obstacle.shape==='circle'){c.beginPath();c.arc(obstacle.x,obstacle.y,obstacle.r,0,Math.PI*2);c.fill();}else{c.fillRect(obstacle.x,obstacle.y,obstacle.w,obstacle.h);c.fillStyle='#b5bb9b';c.fillRect(obstacle.x,obstacle.y,obstacle.w,Math.min(3,obstacle.h));}
            }
            for (const door of doors(state)) {
                c.fillStyle = door.locked ? '#d1a170' : '#a5bd86';
                if(door.locked)c.fillRect(door.x, door.y, door.w, door.h);
                c.strokeStyle = door.locked?'#19231c':'#a5bd86';c.setLineDash(door.locked?[]:[8,6]);
                c.lineWidth = 2 / z;
                c.strokeRect(door.x, door.y, door.w, door.h);c.setLineDash([]);
            }
            for (const task of state.tasks) {
                for (const point of [task.position, ...(task.secondPosition ? [task.secondPosition] : [])]) {
                    c.fillStyle = task.complete ? '#91ac77' : '#d4c28d';
                    c.fillRect(point.x - 7, point.y - 7, 14, 14);
                }
                c.font = `${8 / z}px monospace`;
                c.fillStyle = task.complete ? '#a7c18b' : '#d4c28d';
                c.fillText(task.complete ? 'OK' : task.role, task.position.x, task.position.y - 13);
            }
            for (const emergency of state.emergencies.filter(e => e.status === 'active')) {
                for (const point of [emergency.position, ...(emergency.secondPosition ? [emergency.secondPosition] : [])]) {
                    c.strokeStyle = '#dfaf7a';
                    c.lineWidth = 1.5 / z;
                    c.beginPath();
                    c.arc(point.x, point.y, 25, 0, 7);
                    c.stroke();
                }
                c.fillStyle = '#edc792';
                c.font = `bold ${10 / z}px monospace`;
                c.fillText('!', emergency.position.x, emergency.position.y + 5);
            }
            for (const threat of state.threats.filter(t => t.status === 'active')) {
                c.fillStyle = '#bba3c7';
                c.beginPath();
                c.moveTo(threat.position.x, threat.position.y - 14);
                c.lineTo(threat.position.x + 12, threat.position.y);
                c.lineTo(threat.position.x, threat.position.y + 14);
                c.lineTo(threat.position.x - 12, threat.position.y);
                c.closePath();
                c.fill();
                c.font = `${8 / z}px monospace`;
                c.fillStyle = '#d0bdd8';
                c.fillText(threat.name.toUpperCase(), threat.position.x, threat.position.y - 21);
            }
            for (const role of ['A', 'B'] as const) {
                const p = state.players[role], accent = role === 'A' ? '#e2cc94' : '#b6d2a3';
                c.fillStyle = accent;
                c.save();
                c.translate(p.position.x, p.position.y);
                c.rotate(p.yaw);
                c.beginPath();
                c.moveTo(19, 0);
                c.lineTo(-10, -10);
                c.lineTo(-6, 0);
                c.lineTo(-10, 10);
                c.closePath();
                c.fill();
                c.restore();
                c.strokeStyle = accent;
                c.lineWidth = 1 / z;
                c.beginPath();
                c.arc(p.position.x, p.position.y, 24, 0, 7);
                c.stroke();
                if (p.selected) {
                    c.fillStyle = accent;
                    c.beginPath();
                    c.arc(p.follower.x, p.follower.y, 6, 0, 7);
                    c.fill();
                }
                c.font = `bold ${10 / z}px monospace`;
                c.fillStyle = accent;
                c.fillText(role, p.position.x, p.position.y - 31);
            }
            const exit = center('exit');
            c.strokeStyle = '#a2c389';
            c.lineWidth = 1 / z;
            c.setLineDash([5, 5]);
            c.strokeRect(exit.x - 38, exit.y - 26, 76, 52);
            c.setLineDash([]);
            if (placement) {
                c.strokeStyle = walkable(placement, state) ? '#efdeb0' : '#e2a281';
                c.lineWidth = 2 / z;
                c.beginPath();
                c.arc(placement.x, placement.y, 28, 0, 7);
                c.moveTo(placement.x - 40, placement.y);
                c.lineTo(placement.x + 40, placement.y);
                c.moveTo(placement.x, placement.y - 40);
                c.lineTo(placement.x, placement.y + 40);
                c.stroke();
            }
            c.restore();
        };
        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [state, placement]);
    function position(e: React.MouseEvent<HTMLCanvasElement>) { const b = e.currentTarget.getBoundingClientRect(), z = Math.min((b.width - 34) / WORLD.w, (b.height - 48) / WORLD.h); return { x: (e.clientX - b.left - (b.width - WORLD.w * z) / 2) / z, y: (e.clientY - b.top - (b.height - WORLD.h * z) / 2 - 8) / z }; }
    return <canvas ref={ref} className="ghost-map" aria-label="Authoritative overhead facility map" onMouseMove={e => {const at=position(e);e.currentTarget.title=roomName(roomAt(at)); if (onPlace) {
        const p = position(e);
        e.currentTarget.title = `${roomName(roomAt(p))} / ${Math.round(p.x)}, ${Math.round(p.y)} / ${walkable(p, state) ? 'walkable placement' : 'blocked geometry'}`;
        e.currentTarget.style.cursor = 'crosshair';
    } }} onClick={e => onPlace?.(position(e))}/>;
}
