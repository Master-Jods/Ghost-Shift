import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { buildFacility } from './facility3d';
import LegacyFirstPerson from './LegacyFirstPerson';
import { rooms, doors, center, walkable, distance, type Vec } from './world';
import { art, sprite, backSprite } from './data';
import type { State } from './engine';
import { PresentationTimeline, defaultPresentation, cueProgress, type PresentationSettings } from './presentation';
import { FacilityAudio } from './audio';
type Props = {
    state: State;
    role: 'A' | 'B';
    yaw: number;
    pitch: number;
    inputEnabled: boolean;
    flashlight: boolean;
    reduced: boolean;
    onLook: (dx: number, dy: number) => void;
    onLock: (value: boolean) => void;
    settings?: PresentationSettings;
    tracked?: {id:string;position:Vec};
    focus?: {
        id: string;
        position: Vec;
        label: string;
        kind: string;
    };
};
export default function FirstPerson(props: Props) { const [failed, setFailed] = useState(false); return failed ? <><LegacyFirstPerson {...props}/><div className="renderer-warning">WebGL unavailable: compatibility renderer · vertical look and 3D shadows unavailable</div></> : <WorldView {...props} onFailure={() => setFailed(true)}/>; }
function WorldView(props: Props & {
    onFailure: () => void;
}) {
    const ref = useRef<HTMLCanvasElement>(null), latest = useRef(props);
    latest.current = props;
    useEffect(() => {
        const canvas = ref.current!;
        let renderer: T.WebGLRenderer;
        try {
            renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
        }
        catch {
            latest.current.onFailure();
            return;
        }
        canvas.dataset.renderer = 'webgl';
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
        const scene = new T.Scene();
        scene.background = new T.Color('#263238');
        scene.fog = new T.FogExp2('#263238', .00105);
        const facility = buildFacility(scene), camera = new T.PerspectiveCamera(65, 1, 1, 2000);
        camera.rotation.order = 'YXZ';
        const hemi = new T.HemisphereLight('#d8e6e4', '#6c6552', 2.1);
        scene.add(hemi);
        const sun = new T.DirectionalLight('#eee5cc', 1.1);
        sun.position.set(400, 600, 100);
        scene.add(sun);
        const pools = Array.from({ length: 3 }, () => { const light = new T.PointLight('#d6e1da', 2600, 240, 1.6); scene.add(light); return light; });
        const flash = new T.SpotLight('#f5ebca', 2200, 470, Math.PI / 5, .65, 1.4);
        flash.castShadow = true;
        flash.shadow.mapSize.set(512, 512);
        flash.shadow.camera.near = 8;
        flash.shadow.camera.far = 500;
        flash.shadow.bias = -.0002;
        scene.add(flash, flash.target);
        const audio = new FacilityAudio(), timeline = new PresentationTimeline();
        const dynamicGeometry: T.BufferGeometry[] = [], dynamicMaterials: T.Material[] = [], dynamicTextures: T.Texture[] = [];
        const textureCache = new Map<string, {
            texture: T.Texture;
            width: number;
            height: number;
            ready: boolean;
        }>();
        let disposed = false;
        function pokemonTexture(id: number, back: boolean) {
            const key = id + ':' + back;
            let entry = textureCache.get(key);
            if (entry)
                return entry;
            const c = document.createElement('canvas');
            c.width = c.height = 256;
            const tx = new T.CanvasTexture(c);
            tx.colorSpace = T.SRGBColorSpace;
            tx.minFilter = T.LinearMipmapLinearFilter;
            tx.magFilter = T.LinearFilter;
            entry = { texture: tx, width: 1, height: 1, ready: false };
            textureCache.set(key, entry);
            dynamicTextures.push(tx);
            const entryRef = entry;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            let fallback = 0;
            img.onload = () => { if (disposed || textureCache.get(key) !== entryRef)
                return; try {
                const ctx = c.getContext('2d')!;
                ctx.clearRect(0, 0, 256, 256);
                ctx.drawImage(img, 0, 0, 256, 256);
                const pixels = ctx.getImageData(0, 0, 256, 256).data;
                let left = 256, right = 0, top = 256, bottom = 0;
                for (let y = 0; y < 256; y++)
                    for (let x = 0; x < 256; x++)
                        if (pixels[(y * 256 + x) * 4 + 3] > 20) {
                            left = Math.min(left, x);
                            right = Math.max(right, x);
                            top = Math.min(top, y);
                            bottom = Math.max(bottom, y);
                        }
                const w = right - left + 1, h = bottom - top + 1;
                ctx.clearRect(0, 0, 256, 256);
                ctx.drawImage(img, left / 256 * img.width, top / 256 * img.height, w / 256 * img.width, h / 256 * img.height, 0, 0, 256, 256);
                entryRef.width = w;
                entryRef.height = h;
                entryRef.ready = true;
                tx.needsUpdate = true;
            }
            catch {
                entryRef.ready = true;
            } };
            img.onerror = () => { if (fallback++ < 2)
                img.src = fallback === 1 ? sprite(id) : art(id); };
            img.src = back ? backSprite(id) : art(id);
            if (textureCache.size > 64) {
                for (const [oldKey, old] of textureCache) {
                    if (oldKey !== key && ![...entities.values()].some(e => e.mesh.material.map === old.texture)) {
                        old.texture.dispose();
                        textureCache.delete(oldKey);
                        break;
                    }
                }
            }
            return entry;
        }
        const plane = new T.PlaneGeometry(1, 1);
        dynamicGeometry.push(plane);
        const entities = new Map<string, {
            mesh: T.Mesh<T.PlaneGeometry, T.MeshStandardMaterial>;
            shadow: T.Mesh;
            id: number;
            pos: Vec;
        }>();
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = shadowCanvas.height = 128;
        const sg = shadowCanvas.getContext('2d')!, gradient = sg.createRadialGradient(64, 64, 5, 64, 64, 63);
        gradient.addColorStop(0, '#00000099');
        gradient.addColorStop(1, '#00000000');
        sg.fillStyle = gradient;
        sg.fillRect(0, 0, 128, 128);
        const shadowTex = new T.CanvasTexture(shadowCanvas);
        dynamicTextures.push(shadowTex);
        const shadowMat = new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
        dynamicMaterials.push(shadowMat);
        const gateMeshes = new Map<string, T.Mesh>();
        const gateMat = new T.MeshStandardMaterial({ color: '#596d6d', metalness: .5, roughness: .6 });
        dynamicMaterials.push(gateMat);
        for (const d of doors()) {
            const geo = new T.BoxGeometry(d.w, 100, d.h), mesh = new T.Mesh(geo, gateMat);
            dynamicGeometry.push(geo);
            mesh.position.set(d.x + d.w / 2, 50, d.y + d.h / 2);
            mesh.castShadow = mesh.receiveShadow = true;
            scene.add(mesh);
            gateMeshes.set(d.id, mesh);
        }
        const objectiveMaterial = new T.MeshBasicMaterial({ color: '#e0be74', transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false });
        dynamicMaterials.push(objectiveMaterial);
        const objectiveGeometry = new T.RingGeometry(7, 9, 24);
        objectiveGeometry.rotateX(-Math.PI / 2);
        dynamicGeometry.push(objectiveGeometry);
        const objectiveMarkers = Array.from({ length: 8 }, () => { const mesh = new T.Mesh(objectiveGeometry, objectiveMaterial); scene.add(mesh); mesh.visible = false; return mesh; });
        const fxGeo = new T.RingGeometry(8, 10, 32);
        fxGeo.rotateX(-Math.PI / 2);
        dynamicGeometry.push(fxGeo);
        const fx = Array.from({ length: 24 }, () => { const m = new T.MeshBasicMaterial({ color: '#a6e4d1', transparent: true, depthWrite: false, side: T.DoubleSide }); dynamicMaterials.push(m); const mesh = new T.Mesh(fxGeo, m); scene.add(mesh); mesh.visible = false; return mesh; });
        // Original solid scanner, glove and sleeve, rendered in a camera-attached tool scene.
        const toolScene = new T.Scene(), toolCamera = new T.PerspectiveCamera(60, 1, .01, 10), tool = new T.Group();
        toolScene.add(tool);
        toolScene.add(new T.HemisphereLight('#e8e2d0', '#22312e', 3));
        const toolLight = new T.DirectionalLight('#fff4d7', 2);
        toolLight.position.set(1, 2, 2);
        toolScene.add(toolLight);
        const toolMat = new T.MeshStandardMaterial({ color: '#52645c', roughness: .8, metalness: .25 }), gloveMat = new T.MeshStandardMaterial({ color: '#7b7960', roughness: .9 }), darkMat = new T.MeshStandardMaterial({ color: '#1d2d2e', roughness: .8 });
        dynamicMaterials.push(toolMat, gloveMat, darkMat);
        function part(w: number, h: number, d: number, x: number, y: number, z: number, m: T.Material) { const geo = new T.BoxGeometry(w, h, d); dynamicGeometry.push(geo); const mesh = new T.Mesh(geo, m); mesh.position.set(x, y, z); tool.add(mesh); return mesh; }
        part(.17, .24, .12, 0, 0, 0, toolMat);
        part(.13, .1, .01, 0, .04, .065, darkMat);
        part(.06, .16, .08, -.015, -.17, .03, gloveMat);
        part(.1, .28, .11, .02, -.32, -.01, toolMat);
        part(.1, .02, .15, 0, .13, 0, darkMat);
        const screenCanvas = document.createElement('canvas');
        screenCanvas.width = 256;
        screenCanvas.height = 128;
        const stx = new T.CanvasTexture(screenCanvas);
        stx.colorSpace = T.SRGBColorSpace;
        dynamicTextures.push(stx);
        const screenMat = new T.MeshBasicMaterial({ map: stx });
        dynamicMaterials.push(screenMat);
        part(.115, .075, .005, 0, .043, .073, screenMat);
        let frame = 0, last = performance.now(), fpsAt = last, frames = 0, lastScreen = '', visual = { ...latest.current.state.players[latest.current.role].position }, previous = { ...visual }, lookYaw = latest.current.yaw, lookPitch = latest.current.pitch, walk = 0, steps = 0, travelled = 0, cpu = 0, samples = 0, quality = '', w = 0, h = 0;
        const unlock = () => void audio.unlock(latest.current.settings || defaultPresentation), unlockSettings = (e: Event) => void audio.unlock((e as CustomEvent<PresentationSettings>).detail);
        const enabled = () => latest.current.inputEnabled && !document.hidden && document.hasFocus();
        const mouse = (e: MouseEvent) => { if (document.pointerLockElement === canvas && enabled())
            latest.current.onLook(e.movementX, e.movementY); };
        const lock = () => latest.current.onLock(document.pointerLockElement === canvas);
        const blur = () => audio.configure(latest.current.settings || defaultPresentation, false);
        const contextLost = (e: Event) => { e.preventDefault(); latest.current.onFailure(); };
        const intent = () => { const v = latest.current, p = v.state.players[v.role]; audio.play('submitted', p.position, p.position, v.yaw); timeline.push('submitted', p.position, 'Transmitting', performance.now()); };
        document.addEventListener('mousemove', mouse);
        document.addEventListener('pointerlockchange', lock);
        document.addEventListener('pointerdown', unlock);
        document.addEventListener('keydown', unlock);
        window.addEventListener('ghost-audio-unlock', unlockSettings);
        window.addEventListener('ghost-intent', intent);
        window.addEventListener('blur', blur);
        canvas.addEventListener('webglcontextlost', contextLost);
        const paint = (now: number) => {
            if (disposed)
                return;
            const begin = performance.now(), v = latest.current, s = v.state, p = s.players[v.role], o = v.settings || defaultPresentation, dt = Math.min(.06, (now - last) / 1000);
            last = now;
            const rect = canvas.getBoundingClientRect(), cap = { low: 480, standard: 960, high: 1600 }[o.quality], nextW = Math.max(320, Math.round(Math.min(rect.width, cap) * o.renderScale)), nextH = Math.max(180, Math.round(nextW * rect.height / Math.max(1, rect.width)));
            if (nextW !== w || nextH !== h) {
                w = nextW;
                h = nextH;
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                toolCamera.aspect = w / h;
                toolCamera.updateProjectionMatrix();
                canvas.dataset.renderResolution = w + 'x' + h;
            }
            const q = o.quality + ':' + o.shadows;
            if (q !== quality) {
                quality = q;
                renderer.shadowMap.enabled = o.shadows && o.quality !== 'low';
                flash.castShadow = renderer.shadowMap.enabled;
                flash.shadow.mapSize.set(o.quality === 'high' ? 1024 : 512, o.quality === 'high' ? 1024 : 512);
                flash.shadow.map?.dispose();
                flash.shadow.map = null;
            }
            camera.fov = 2 * Math.atan(Math.tan(o.fov * Math.PI / 360) / camera.aspect) * 180 / Math.PI;
            camera.updateProjectionMatrix();
            for(const fixture of facility.fixtures)fixture.rotation.z=o.reducedMotion?0:Math.sin(now*.0007)*.045;
            const moved = distance(previous, p.position);
            if (moved < 50) {
                travelled += moved;
                steps += moved;
            }
            previous = { ...p.position };
            walk += (moved < 50 ? moved : 0) * .085;
            if (distance(visual, p.position) > 100)
                visual = { ...p.position };
            const blend = 1 - Math.exp(-25 * dt);
            visual.x += (p.position.x - visual.x) * blend;
            visual.y += (p.position.y - visual.y) * blend;
            if (!o.smoothing || !v.inputEnabled) {
                lookYaw = v.yaw;
                lookPitch = v.pitch;
            }
            else {
                lookYaw += Math.atan2(Math.sin(v.yaw - lookYaw), Math.cos(v.yaw - lookYaw)) * (1 - Math.exp(-32 * dt));
                lookPitch += (v.pitch - lookPitch) * (1 - Math.exp(-32 * dt));
            }
            const cues = timeline.observe(s, v.role, now);
            for (const cue of cues) {
                audio.play(cue.kind, cue.position, p.position, v.yaw);
                window.dispatchEvent(new CustomEvent('ghost-feedback', { detail: cue }));
            }
            const active = timeline.active(now), shake = !o.reducedMotion ? active.filter(c => c.kind === 'impact').reduce((n, c) => n + (1 - cueProgress(c, now)) * .3 * o.cameraShake, 0) : 0;
            camera.position.set(visual.x, 42 + (!o.reducedMotion ? Math.sin(walk) * o.headBob * .8 : 0) + Math.sin(now * .1) * shake, visual.y);
            camera.rotation.set(lookPitch, -lookYaw - Math.PI / 2, 0, 'YXZ');
            canvas.dataset.yaw = String(v.yaw);
            canvas.dataset.pitch = String(v.pitch);
            const black = s.emergencies.some(e => e.status === 'active' && e.kind === 'blackout' && ['either', 'both', v.role].includes(e.scope)), danger = s.threats.find(t => t.status === 'active' && s.worldTime >= t.activeAt && !t.disabledEffect && distance(t.position, p.position) < 210);
            hemi.intensity = black ? .55 : 1.8;
            sun.intensity = black ? .12 : .6;
            renderer.toneMappingExposure = o.brightness * (o.postProcessing ? 1.16 : 1.3);
            const fog = scene.fog as T.FogExp2;
            fog.density = danger?.behavior === 'fog' ? .008 : o.postProcessing ? .00085 : 0;
            fog.color.set(danger?.behavior === 'fatigue' ? '#443342' : danger?.behavior === 'frost' ? '#6d8890' : '#263238');
            scene.background = fog.color;
            const nearest = [...rooms].sort((a, b) => distance(center(a.id), p.position) - distance(center(b.id), p.position)).slice(0, 3);
            pools.forEach((light, i) => { const r = nearest[i]; light.position.set(r.x + r.w / 2, 88, r.y + r.h / 2); light.intensity = black ? 150 : 3100; });
            flash.visible = v.flashlight;
            flash.position.copy(camera.position);
            flash.target.position.set(visual.x + Math.cos(v.yaw) * 180, 42 + Math.tan(v.pitch) * 180, visual.y + Math.sin(v.yaw) * 180);
            audio.configure(o, !document.hidden && document.hasFocus());
            canvas.dataset.audio = audio.ready ? 'running' : 'locked-or-muted';
            if (steps > 70) {
                steps %= 70;
                audio.play('step', p.position, p.position, v.yaw, p.room === 'medical' ? 'rubber' : 'metal');
            }
            for (const d of doors(s)) {
                const mesh = gateMeshes.get(d.id)!;
                const target = d.locked ? 50 : 158;
                mesh.position.y += (target - mesh.position.y) * (1 - Math.exp(-12 * dt));
            }
            const visibleObjectives = s.tasks.filter(t => !t.complete && (t.role === v.role || t.role === 'both'));
            objectiveMarkers.forEach((marker, i) => { const t = visibleObjectives[i]; marker.visible = false; if (t) {
                const pos = t.mode === 'cooperative' && v.role === 'B' ? t.secondPosition! : t.mode === 'transfer' && t.carrier ? t.destination! : t.position;
                marker.visible = distance(pos,p.position)<300;
                marker.position.set(pos.x, .9, pos.y);
            } });
            if(v.tracked){const marker=objectiveMarkers[0];marker.visible=distance(v.tracked.position,p.position)<500;marker.position.set(v.tracked.position.x,1,v.tracked.position.y);marker.scale.setScalar(1.5);for(let i=1;i<objectiveMarkers.length;i++)objectiveMarkers[i].visible=false;}else objectiveMarkers.forEach(m=>m.scale.setScalar(1));
            const desired = new Set<string>();
            const show = (key: string, id: number, pos: Vec, height: number, back: boolean, alpha = 1) => { if (!id || pos.x < 0)
                return; desired.add(key); let ent = entities.get(key); if (!ent) {
                const mat = new T.MeshStandardMaterial({ transparent: true, alphaTest: .07, roughness: 1, side: T.DoubleSide });
                dynamicMaterials.push(mat);
                const mesh = new T.Mesh(plane, mat), shadow = new T.Mesh(plane, shadowMat);
                shadow.rotation.x = -Math.PI / 2;
                shadow.scale.set(height * .9, height * .6, 1);
                scene.add(mesh, shadow);
                ent = { mesh, shadow, id, pos: { ...pos } };
                entities.set(key, ent);
            } const tex = pokemonTexture(id, back); if (distance(ent.pos, pos) > 120)
                ent.pos = { ...pos }; ent.pos.x += (pos.x - ent.pos.x) * blend; ent.pos.y += (pos.y - ent.pos.y) * blend; ent.mesh.material.map = tex.texture; ent.mesh.material.opacity = alpha; ent.mesh.material.emissive.set(alpha < 1 ? '#569d9c' : '#000000'); ent.mesh.material.emissiveIntensity = alpha < 1 ? .5 : 0; ent.mesh.visible = tex.ready; ent.mesh.position.set(ent.pos.x, height / 2, ent.pos.y); ent.mesh.rotation.y = -v.yaw + Math.PI / 2; ent.mesh.scale.set(height * tex.width / tex.height, height, 1); ent.shadow.position.set(ent.pos.x, .55, ent.pos.y); ent.shadow.visible = o.shadows && alpha > .1; };
            for (const r of ['A', 'B'] as const) {
                const player = s.players[r];
                const away = Math.cos(player.yaw) * (visual.x - player.follower.x) + Math.sin(player.yaw) * (visual.y - player.follower.y) < 0;
                if (r !== v.role || distance(player.follower, p.position) > 50)
                    show('companion-' + r, player.selected, player.follower, 27, away, r === v.role ? Math.min(1, (distance(player.follower, p.position) - 50) / 20) : 1);
                if (r !== v.role && player.position.x >= 0) {
                    // Other trainer uses original simple volumetric equipment silhouette, not a Pokemon asset.
                    const key = 'trainer-' + r;
                    desired.add(key);
                    let ent = entities.get(key);
                    if (!ent) {
                        const c = document.createElement('canvas');
                        c.width = 128;
                        c.height = 256;
                        const ctx = c.getContext('2d')!;
                        ctx.fillStyle = '#9aab9c';
                        ctx.fillRect(43, 15, 43, 43);
                        ctx.fillStyle = '#4c6668';
                        ctx.fillRect(32, 60, 65, 105);
                        ctx.fillStyle = '#243b3e';
                        ctx.fillRect(35, 165, 23, 90);
                        ctx.fillRect(73, 165, 23, 90);
                        const texture = new T.CanvasTexture(c);
                        dynamicTextures.push(texture);
                        const m = new T.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: .1, side: T.DoubleSide });
                        dynamicMaterials.push(m);
                        const mesh = new T.Mesh(plane, m), shadow = new T.Mesh(plane, shadowMat);
                        shadow.rotation.x = -Math.PI / 2;
                        shadow.scale.set(30, 22, 1);
                        scene.add(mesh, shadow);
                        ent = { mesh, shadow, id: 0, pos: { ...player.position } };
                        entities.set(key, ent);
                    }
                    ent.mesh.position.set(player.position.x, 25, player.position.y);
                    ent.mesh.rotation.y = -v.yaw + Math.PI / 2;
                    ent.mesh.scale.set(25, 50, 1);
                    ent.shadow.position.set(player.position.x, .5, player.position.y);
                    ent.shadow.visible = o.shadows;
                }
            }
            for (const t of s.threats.filter(t => t.status === 'active')) {
                const telegraph = Math.max(.2, Math.min(1, 1 - (t.activeAt - s.worldTime) / 3));
                show(t.instanceId, t.id, t.position, 52, false, telegraph);
            }
            for (const [key, ent] of entities)
                if (!desired.has(key)) {
                    scene.remove(ent.mesh, ent.shadow);
                    ent.mesh.material.dispose();
                    entities.delete(key);
                }
            fx.forEach((mesh, i) => { const c = active[i]; mesh.visible = !!c && c.kind !== 'step' && c.kind !== 'radio' && c.kind !== 'submitted'; if (c) {
                const progress = cueProgress(c, now);
                mesh.position.set(c.position.x, 1 + i * .015, c.position.y);
                mesh.scale.setScalar(1 + progress * 4);
                mesh.material.opacity = (1 - progress) * .65;
                mesh.material.color.set(c.kind === 'impact' ? '#e8ac81' : c.kind === 'materialize' ? '#b9a0e7' : '#a6e4d1');
            } });
            const near = walkable({ x: p.position.x + Math.cos(v.yaw) * 24, y: p.position.y + Math.sin(v.yaw) * 24 }, s, null, false, 0);
            const raise = active.find(c => ['contain', 'attack', 'guard'].includes(c.kind));
            tool.position.set(.28 + (!o.reducedMotion ? Math.sin(walk * .5) * .006 : 0), -.23 - (near ? 0 : .12) + (raise && !o.reducedMotion ? Math.sin(cueProgress(raise, now) * Math.PI) * .05 : 0), -.6);
            tool.rotation.set(-.1, .08, -.06);
            const label = p.selected + ' / ' + (v.focus ? 'LINK READY' : 'SCAN READY');
            if (label !== lastScreen) {
                lastScreen = label;
                const ctx = screenCanvas.getContext('2d')!;
                ctx.fillStyle = '#9aba91';
                ctx.fillRect(0, 0, 256, 128);
                ctx.fillStyle = '#284c3a';
                ctx.font = 'bold 26px monospace';
                ctx.fillText('FIELD / ' + p.selected, 12, 42);
                ctx.font = '20px monospace';
                ctx.fillText(v.focus ? 'LINK READY' : 'SCAN READY', 12, 83);
                stx.needsUpdate = true;
            }
            renderer.autoClear = true;
            renderer.render(scene, camera);
            renderer.autoClear = false;
            renderer.clearDepth();
            renderer.render(toolScene, toolCamera);
            cpu += performance.now() - begin;
            samples++;
            frames++;
            if (now - fpsAt > 1000) {
                canvas.dataset.fps = (frames * 1000 / (now - fpsAt)).toFixed(1);
                canvas.dataset.frameMs = (cpu / samples).toFixed(2);
                fpsAt = now;
                frames = 0;
                cpu = 0;
                samples = 0;
                const el = canvas.parentElement?.querySelector('.fps-counter');
                if (el)
                    el.textContent = o.showFps ? canvas.dataset.fps + ' FPS · ' + w + '×' + h : '';
            }
            frame = requestAnimationFrame(paint);
        };
        frame = requestAnimationFrame(paint);
        return () => { disposed = true; cancelAnimationFrame(frame); audio.dispose(); facility.dispose(); dynamicGeometry.forEach(g => g.dispose()); dynamicMaterials.forEach(m => m.dispose()); dynamicTextures.forEach(t => t.dispose()); flash.shadow.dispose(); renderer.dispose(); document.removeEventListener('mousemove', mouse); document.removeEventListener('pointerlockchange', lock); document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); window.removeEventListener('ghost-audio-unlock', unlockSettings); window.removeEventListener('ghost-intent', intent); window.removeEventListener('blur', blur); canvas.removeEventListener('webglcontextlost', contextLost); };
    }, []);
    return <><canvas ref={ref} className="first-person" aria-label="First-person research facility" tabIndex={0} onClick={() => { if (props.inputEnabled && !document.pointerLockElement)
        void ref.current?.requestPointerLock(); }}/><div className="world-reticle"/><div className="fps-counter" aria-live="off"/></>;
}
