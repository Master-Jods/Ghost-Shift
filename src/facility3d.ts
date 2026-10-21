import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD, floors, wallSegments, rooms, roomWalls, roomPortals, roomEquipment, center, pathLength, pathDirection, contains, type Vec } from './world';
/** Original procedural materials, lettering, posters and solid equipment. World units are shared with the server. */
export function buildFacility(scene: T.Scene) {
    const textures: T.Texture[] = [], materials: T.Material[] = [], geometries: T.BufferGeometry[] = [];
    const batches = new Map<T.Material, T.BufferGeometry[]>();
    const rng = (x: number, y: number) => { let n = Math.imul(x + 91, 374761393) ^ Math.imul(y + 13, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
    function surface(kind: string) {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const g = c.getContext('2d')!, data = g.createImageData(512, 512);
        for (let y = 0; y < 512; y++)
            for (let x = 0; x < 512; x++) {
                const n = rng(x, y), i = (y * 512 + x) * 4;
                let rgb = kind === 'floor' ? [96, 102, 101] : kind === 'wall' ? (y < 310 ? [163, 162, 149] : [73, 91, 91]) : [68, 77, 79];
                let grain = (n - .5) * 9, stain = Math.sin(x * .03 + y * .007) * Math.sin(y * .017) * 4;
                if (kind === 'floor' && (x % 128 < 2 || y % 128 < 2))
                    grain -= 33;
                if (kind === 'wall' && (y === 310 || y === 315))
                    grain -= 28;
                if (kind === 'ceiling' && (x % 256 < 4 || y % 128 < 3))
                    grain -= 24;
                if (n > .999)
                    grain -= 28;
                for (let k = 0; k < 3; k++)
                    data.data[i + k] = rgb[k] + grain + stain;
                data.data[i + 3] = 255;
            }
        g.putImageData(data, 0, 0);
        const t = new T.CanvasTexture(c);
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.colorSpace = T.SRGBColorSpace;
        t.anisotropy = 4;
        textures.push(t);
        return t;
    }
    const make = (color: string, roughness = .85, metalness = .1) => { const m = new T.MeshStandardMaterial({ color, roughness, metalness }); materials.push(m); return m; };
    const wall = new T.MeshStandardMaterial({ map: surface('wall'), roughness: .96 });
    const floor = new T.MeshStandardMaterial({ map: surface('floor'), roughness: .83 });
    const ceiling = new T.MeshStandardMaterial({ map: surface('ceiling'), roughness: .9 });
    materials.push(wall, floor, ceiling);
    const steel = make('#455554', .65, .5), trim = make('#293a3c', .65, .4), lightMetal = make('#a6aea3', .65, .35), rubber = make('#1c2b2b'), wood = make('#797464'), warm = make('#a58d55');
    const screen = new T.MeshStandardMaterial({ color: '#5daaa6', emissive: '#4f9290', emissiveIntensity: .5, roughness: .4 });
    const lamp = new T.MeshBasicMaterial({ color: '#f4ead2' });
    materials.push(screen, lamp);
    function box(x: number, y: number, z: number, w: number, h: number, d: number, m: T.Material) { const geo = new T.BoxGeometry(w, h, d); geo.translate(x, y, z); const list = batches.get(m) || []; list.push(geo); batches.set(m, list); }
    function cylinder(x: number, y: number, z: number, r: number, h: number, m: T.Material, axis = 'y') {
        const geo = new T.CylinderGeometry(r, r, h, 12);
        if (axis === 'x')
            geo.rotateZ(Math.PI / 2);
        if (axis === 'z')
            geo.rotateX(Math.PI / 2);
        geo.translate(x, y, z);
        const list = batches.get(m) || [];
        list.push(geo);
        batches.set(m, list);
    }
    const edges=wallSegments;
    for (const e of edges) {
        const horizontal = e.axis === 'x', x = e.x + (horizontal ? e.length / 2 : e.normal), z = e.z + (horizontal ? e.normal : e.length / 2);
        const geo = new T.BoxGeometry(horizontal ? e.length : 2, 108, horizontal ? 2 : e.length);
        const uv = geo.getAttribute('uv');
        for (let i = 0; i < uv.count; i++)
            uv.setXY(i, uv.getX(i) * (horizontal ? e.length : 108) / 120, uv.getY(i));
        geo.translate(x, 54, z);
        const list = batches.get(wall) || [];
        list.push(geo);
        batches.set(wall, list);
        box(x, 4, z, horizontal ? e.length : 3, 8, horizontal ? 3 : e.length, trim);
        box(x, 101, z, horizontal ? e.length : 4, 5, horizontal ? 4 : e.length, trim);
        if (e.length > 90) {
            const offset = -e.normal * 2;
            for (const h of [86, 93])
                cylinder(horizontal ? x : x + offset, h, horizontal ? z + offset : z, 1.6, e.length, steel, horizontal ? 'x' : 'z');
        }
    }
    // Planar surfaces use fixed world UV scale rather than stretching one image over each room.
    for (const r of floors)
        for (const top of [false, true]) {
            const geo = new T.PlaneGeometry(r.w, r.h);
            geo.rotateX(top ? Math.PI / 2 : -Math.PI / 2);
            geo.translate(r.x + r.w / 2, top ? 108 : 0, r.y + r.h / 2);
            const uv = geo.getAttribute('uv'), positions = geo.getAttribute('position');
            for (let i = 0; i < uv.count; i++)
                uv.setXY(i, positions.getX(i) / 120, positions.getZ(i) / 120);
            const m = top ? ceiling : floor;
            const list = batches.get(m) || [];
            list.push(geo);
            batches.set(m, list);
        }
    function panel(text: string, sub: string, color: string, diagram = false) {
        const c = document.createElement('canvas');
        c.width = 768;
        c.height = 384;
        const g = c.getContext('2d')!;
        g.fillStyle = diagram ? '#c8bda4' : '#223b3c';
        g.fillRect(0, 0, 768, 384);
        g.strokeStyle = color;
        g.lineWidth = 12;
        g.strokeRect(14, 14, 740, 356);
        g.fillStyle = diagram ? '#293c3c' : '#e8e5d3';
        g.font = 'bold 45px monospace';
        g.fillText(text.toUpperCase(), 36, 84, 695);
        g.font = '22px monospace';
        g.fillText(sub.toUpperCase(), 36, 125, 690);
        if (diagram) {
            g.strokeStyle = '#4d6965';
            g.lineWidth = 5;
            for (let i = 0; i < 4; i++) {
                g.strokeRect(48 + i * 165, 170, 130, 90);
                g.beginPath();
                g.moveTo(110 + i * 165, 260);
                g.lineTo(110 + i * 165, 310);
                g.stroke();
            }
            g.font = '18px monospace';
            g.fillText('01 CHECK IN   02 CALIBRATE   03 ASSIST   04 EXTRACT', 35, 345);
        }
        else {
            g.fillStyle = color;
            g.fillRect(36, 290, 130, 10);
            g.font = '19px monospace';
            g.fillText('ASTER / FIELD RESEARCH DIVISION', 36, 340);
        }
        const t = new T.CanvasTexture(c);
        t.colorSpace = T.SRGBColorSpace;
        textures.push(t);
        const m = new T.MeshStandardMaterial({ map: t, roughness: .9, side: T.FrontSide });
        materials.push(m);
        return m;
    }
    const fixtures: T.Object3D[] = [];
    function planeAt(position: Vec, height: number, normal: Vec, width: number, h: number, m: T.Material) { const mesh = new T.Mesh(new T.PlaneGeometry(width, h), m); mesh.position.set(position.x, height, position.y); mesh.rotation.y = Math.atan2(normal.x, normal.y); scene.add(mesh); geometries.push(mesh.geometry); return mesh; }
    function ringAt(position: Vec, height: number, normal: Vec, radius: number, m: T.Material) { const geo = new T.TorusGeometry(radius, 1, 6, 24), mesh = new T.Mesh(geo, m); mesh.position.set(position.x, height, position.y); mesh.rotation.y = Math.atan2(normal.x, normal.y); scene.add(mesh); geometries.push(geo); return mesh; }
    for (const [index, r] of rooms.entries()) {
        const eq = roomEquipment.find(e => e.roomId === r.id)!, { anchor, normal, tangent, length, depth } = eq;
        const pos = (u: number, v: number) => ({ x: anchor.x + tangent.x * u + normal.x * v, y: anchor.y + tangent.y * u + normal.y * v });
        const b = (u: number, h: number, v: number, width: number, height: number, d: number, m: T.Material) => { const p = pos(u, v); box(p.x, h, p.y, tangent.x ? width : d, height, tangent.x ? d : width, m); };
        const c = (u: number, h: number, v: number, radius: number, height: number, m: T.Material) => { const p = pos(u, v); cylinder(p.x, h, p.y, radius, height, m); };
        const accent = make(r.color, .75, .15);
        const face = (u: number, h: number, v: number, width: number, height: number, text: string, sub: string) => planeAt(pos(u, v), h, normal, width, height, panel(text, sub, r.color));
        // One high room identifier and one purposeful installation per room; the floor stays open.
        face(0, 84, 1.2, Math.min(length, 106), 20, r.name, r.sub);
        b(0, 23, .8, length, 1, 1.6, accent);
        // Services stay above circulation, with one shallow tray and ceiling luminaire.
        box(r.x + r.w / 2, 103, r.y + r.h / 2, 65, 4, 15, trim);
        box(r.x + r.w / 2, 100.8, r.y + r.h / 2, 57, 1, 11, lamp);
        b(0, 101, 9, length, 8, 12, steel);
        for (let u = -length / 2 + 6; u < length / 2; u += 24)
            b(u, 96.5, 9, 2, 1, 13, trim);
        // Vent lives on a separate solid edge, above head height and clear of all signs.
        const ventWall = roomWalls.filter(e => e.roomId === r.id && e !== eq.edge && e.length >= 50).sort((a, b) => b.length - a.length)[0];
        if (ventWall) {
            const p = { x: ventWall.start.x + ventWall.tangent.x * ventWall.length / 2 + ventWall.normal.x * 2, y: ventWall.start.y + ventWall.tangent.y * ventWall.length / 2 + ventWall.normal.y * 2 };
            box(p.x,84,p.y,ventWall.tangent.x?28:3,14,ventWall.tangent.x?3:28,trim);
            for(let i=0;i<6;i++){const q={x:p.x+ventWall.normal.x*1.8,y:p.y+ventWall.normal.y*1.8};box(q.x,79.5+i*1.8,q.y,ventWall.tangent.x?24:1, .8,ventWall.tangent.x?1:24,lightMetal);}
        }
        if (eq.kind === 'reactor') {
            // One wall-side reactor, two independently accessible controls, no duplicate pods.
            c(0, 3, 14, 13, 6, trim);
            c(0, 35, 14, 11, 60, steel);
            c(0, 67, 14, 13, 5, lightMetal);
            for (const h of [16, 35, 54])
                c(0, h, 14, 11.5, 2, accent);
            for (const u of [-30, 30]) {
                b(u, 35, 4, 18, 24, 8, steel);
                face(u, 38, 8.2, 14, 14, u < 0 ? 'A' : 'B', 'STABILIZER');
            }
            const rotor = ringAt(pos(0, 25.5), 37, normal, 8, screen);
            fixtures.push(rotor);
        }
        else if (eq.kind === 'pods') {
            for (const u of [-30, 30]) {
                c(u, 3, 12, 11, 6, trim);
                c(u, 30, 12, 9.5, 48, steel);
                c(u, 56, 12, 11, 5, lightMetal);
                face(u, 33, 22, 14, 24, 'FIELD', 'CONTAINMENT');
                c(u, 22, 12, 10, 1, accent);
            }
            b(0, 17, 4, length, 5, 8, steel);
        }
        else if (eq.kind === 'medical') {
            // Examination bed along the wall, paired with one compact companion scanner.
            b(-20, 10, 14, 64, 4, 28, steel);
            b(-20, 15, 14, 62, 7, 26, lightMetal);
            b(-43, 21, 14, 13, 5, 24, wood);
            for (const u of [-46, 6])
                b(u, 4, 14, 3, 8, 23, trim);
            c(36, 3, 14, 10, 6, steel);
            c(36, 8, 14, 8, 4, accent);
            c(36,20,4,2,34,steel);b(36,32,9,3,3,10,steel);
            const scanner = ringAt(pos(36, 14), 32, normal, 11, lightMetal);
            fixtures.push(scanner);
            face(36, 53, 2, 20, 14, 'SCAN', 'COMPANION CARE');
        }
        else if (eq.kind === 'supplies') {
            // A single defined supply bay, with two boxes rather than a repeated crate maze.
            for (const h of [3, 26, 46])
                b(0, h, 11, length, 2, 22, steel);
            for (const u of [-length / 2 + 2, length / 2 - 2])
                b(u, 24, 11, 3, 48, 22, trim);
            for (const u of [-30, 30]) {
                b(u, 14, 11, 42, 18, 20, wood);
                b(u, 14, 21, 19, 6, .5, lightMetal);
            }
            face(0, 60, 1.5, 74, 12, 'SUPPLIES', 'KEEP AISLE CLEAR');
        }
        else if (eq.kind === 'coolant') {
            for (const u of [-28, 28]) {
                c(u, 35, 7, 3, 56, steel);
                ringAt(pos(u, 11), 37, normal, 8, accent);
                b(u, 37, 11, 13, 2, 2, lightMetal);
            }
            face(0, 62, 1.5, 34, 16, 'COOLANT', 'FLOW CONTROL');
        }
        else if (eq.kind === 'workbench') {
            b(0, 21, 10, length, 4, 20, steel);
            for (const u of [-length / 2 + 3, length / 2 - 3])
                b(u, 10, 10, 4, 20, 17, trim);
            b(0, 49, 1.5, length - 8, 32, 3, trim);
            for (const u of [-32, -12, 12, 32]) {
                b(u, 48, 3.5, 3, 20, 2, lightMetal);
                b(u, 56, 4, 9, 3, 2, warm);
            }
            face(0, 69, 2, 42, 12, 'FUSE', 'SERVICE BENCH');
        }
        else if (eq.kind === 'breakers') {
            b(0, 42, 3, length, 48, 6, steel);
            for (const u of [-36, -12, 12, 36]) {
                b(u, 43, 6.1, 21, 40, .3, lightMetal);
                b(u, 40, 6.5, 5, 10, 1, trim);
                b(u, 55, 6.5, 10, 2, 1, accent);
            }
            face(0, 69, 1.5, 62, 10, 'POWER GRID', 'CIRCUIT CONTROL');
        }
        else if (['relay', 'security', 'navigation', 'override', 'archive'].includes(eq.kind)) {
            b(0, 37, depth / 2, length, 46, depth, steel);
            if (eq.kind === 'archive') {
                for (const h of [23, 36, 49]) {
                    b(0, h, depth + .2, length - 8, 10, .6, trim);
                    for (const u of [-34, 0, 34])
                        b(u, h, depth + .6, 12, 1.5, .6, screen);
                }
            }
            else {
                for (const u of [-25, 25]) {
                    b(u, 48, depth + .2, 38, 24, .7, trim);
                    face(u, 48, depth + .7, 34, 20, eq.kind === 'security' ? 'ACCESS' : eq.kind === 'relay' ? 'RELAY' : 'CONTROL', 'ASTER SYSTEMS');
                }
                b(0, 21, depth + .2, length - 12, 4, 1, lightMetal);
            }
        }
        else {
            // Gathering/transit/check-in spaces have wall information, not freestanding furniture.
            face(0, 48, Math.max(1.5, depth), length - 4, 30, eq.kind === 'information' ? 'FIELD RESEARCH' : eq.kind === 'airlock' ? 'EXTRACTION' : eq.kind === 'wayfinding' ? 'WEST WING' : 'CREW CHECK-IN', eq.kind === 'airlock' ? 'BOTH TRAINERS REQUIRED' : 'KEEP PASSAGE CLEAR');
            if (eq.kind === 'information' || eq.kind === 'checkin') {
                const badge = ringAt(pos(-length / 2 + 11, depth + 1), 49, normal, 6, lightMetal);
                fixtures.push(badge);
            }
        }
    }
    // Entrances are intervals in the canonical floor union, not intersections of overlapping rectangles.
    // Accent strips sit OUTSIDE the opening in the wall; no freestanding doorway pillars narrow it.
    for (const portal of roomPortals) {
        const r = rooms.find(r => r.id === portal.roomId)!, { normal: n, tangent: t, start, length } = portal, mid = { x: start.x + t.x * length / 2, y: start.y + t.y * length / 2 };
        const accent = make(r.color, .8, .1);
        for (const offset of [-2, length + 2]) {
            const p = { x: start.x + t.x * offset, y: start.y + t.y * offset };
            box(p.x, 50, p.y, t.x ? 3 : 2, 92, t.x ? 2 : 3, accent);
        }
        box(mid.x, 105, mid.y, t.x ? length : 3, 6, t.x ? 3 : length, trim);
        const outside = { x: mid.x - n.x * 24, y: mid.y - n.y * 24 };
        const destinations = rooms.filter(v => v.id !== r.id).map(v => { const direction = pathDirection(outside, center(v.id)); return { room: v, length: pathLength(outside, center(v.id)), outward: direction.x * n.x + direction.y * n.y <= 1 }; }).filter(v => v.outward && Number.isFinite(v.length)).sort((a, b) => a.length - b.length);
        const destination = destinations[0]?.room;
        planeAt({ x: mid.x - n.x * 1.2, y: mid.y - n.y * 1.2 }, 87, { x: -n.x, y: -n.y }, Math.min(100, length - 8), 13, panel(r.name, 'ENTER / ' + r.sub, r.color));
        planeAt({ x: mid.x + n.x * 1.2, y: mid.y + n.y * 1.2 }, 87, n, Math.min(100, length - 8), 13, panel(destination ? 'TO ' + destination.name : 'SERVICE PASSAGE', 'FOLLOW THE CORRIDOR', r.color));
    }
    for (const [mat, list] of batches) {
        const merged = mergeGeometries(list);
        list.forEach(g => g.dispose());
        if (!merged)
            continue;
        geometries.push(merged);
        const mesh = new T.Mesh(merged, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }
    return { textures, materials, geometries, fixtures, dispose() { textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); } };
}
