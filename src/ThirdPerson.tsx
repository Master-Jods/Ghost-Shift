import {threatPresentation,threatFacingTarget,playerBattleMotion} from './battlePresentation';
import {createPokemonCharacter,characterAssets} from './pokemonCharacter';
import {pokemonAsset,ensurePokemonAssets} from './pokemonAssets';
import {firstPersonCompanionOpacity,firstPersonPose} from './firstPersonCamera';
import {MovementPrediction}from './movementPrediction';
import{network}from './transport';
import {chasePose,CHASE} from './chaseCamera';
import {createTrainer} from './trainer3d';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { buildFacility } from './facility3d';
import {directionRow,animationState,trainerFrame,pokemonPose,attackColor} from './animation';
import GhostMap from './GhostMap';
import { rooms, doors, gateControl, center, walkable, distance, move, lineOfSight, type Vec } from './world';
import { art, sprite, backSprite } from './data';
import type { State } from './engine';
import { PresentationTimeline, defaultPresentation, cueProgress, type PresentationSettings } from './presentation';
import { facilityAudio } from './audio';
type Props = {
    cameraMode?:'first-person'|'third-person';
    state: State;
    role: 'A' | 'B';
    yaw: number;
    pitch: number;
    inputEnabled: boolean;
    flashlight: boolean;
    reduced: boolean;
    settings?: PresentationSettings;
    tracked?: {id:string;position:Vec};
    focus?: {
        id: string;
        position: Vec;
        label: string;
        kind: string;
    };
};
export default function ThirdPerson(props: Props) { const [failed,setFailed]=useState(false);return failed?<div className="compat-world"><GhostMap state={props.state}/><div className="renderer-warning">WebGL unavailable. Labeled overhead compatibility view; keyboard and touch movement remain active.</div></div>:<WorldView {...props} onFailure={()=>setFailed(true)}/>; }
function WorldView(props: Props & {
    onFailure: () => void;
}) {
    const ref = useRef<HTMLCanvasElement>(null), latest = useRef(props);
    latest.current = props;
    useEffect(() => {
        const canvas = ref.current!;
        void ensurePokemonAssets().catch(()=>{});
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
        const facility = buildFacility(scene,false), camera = new T.PerspectiveCamera(72, 1, 1, 1600);
        camera.rotation.order = 'YXZ';scene.add(camera);const movementPrediction=new MovementPrediction();
        const hemi = new T.HemisphereLight('#b5d0da', '#222830', 1.35);
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
        const audio = facilityAudio, timeline = new PresentationTimeline();
        const dynamicGeometry: T.BufferGeometry[] = [], dynamicMaterials: T.Material[] = [], dynamicTextures: T.Texture[] = [];
        const textureCache = new Map<string, {
            texture: T.Texture;
            width: number;
            height: number;
            ready: boolean;
        }>();
        let disposed = false;const imageTimers=new Set<ReturnType<typeof setTimeout>>();
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
            const drawMissing=()=>{if(disposed||entryRef.ready)return;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,256,256);ctx.strokeStyle='#b6bda8';ctx.fillStyle='#e6dcc1';ctx.lineWidth=4;ctx.beginPath();ctx.arc(128,106,50,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(78,106);ctx.lineTo(178,106);ctx.stroke();ctx.textAlign='center';ctx.font='22px monospace';ctx.fillText('#'+id,128,200);entryRef.width=128;entryRef.height=170;entryRef.ready=true;tx.needsUpdate=true;};
            const timer=setTimeout(()=>{imageTimers.delete(timer);img.onload=img.onerror=null;drawMissing();},12000);imageTimers.add(timer);
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
                clearTimeout(timer);imageTimers.delete(timer);entryRef.ready = true;
                tx.needsUpdate = true;
            }
            catch {
                entryRef.ready = true;
            } };
            img.onerror=()=>{if(disposed)return;if(fallback++<2){img.src=fallback===1?sprite(id):art(id);return;}
              const ctx=c.getContext('2d')!;ctx.clearRect(0,0,256,256);ctx.fillStyle='#1c3338';ctx.fillRect(20,46,216,164);ctx.strokeStyle='#a8b8a1';ctx.lineWidth=4;ctx.strokeRect(20,46,216,164);ctx.textAlign='center';ctx.fillStyle='#eee0bd';ctx.font='bold 25px monospace';ctx.fillText('POKÉMON #'+id,128,112);ctx.font='17px monospace';ctx.beginPath();ctx.arc(128,169,22,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(106,169);ctx.lineTo(150,169);ctx.stroke();entryRef.width=216;entryRef.height=164;entryRef.ready=true;tx.needsUpdate=true;
            };
            const reference=pokemonAsset(id).referenceArtwork;if(reference?.availability==='missing-reference'){clearTimeout(timer);imageTimers.delete(timer);drawMissing();}else img.src = back ? backSprite(id) : reference?.path||art(id);
            if (textureCache.size > 64) {
                for (const [oldKey, old] of textureCache) {
                    if (oldKey !== key && ![...entities.values()].some(e => e.mesh.material.map === old.texture)) {
                        old.texture.dispose();
                        const ownedIndex=dynamicTextures.indexOf(old.texture);if(ownedIndex>=0)dynamicTextures.splice(ownedIndex,1);
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
            character?:ReturnType<typeof createPokemonCharacter>;
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
            const geo = new T.BoxGeometry(d.w, 108, d.h), mesh = new T.Mesh(geo, gateMat);
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
        const focusGeo=new T.TorusGeometry(12,1.3,6,32),focusMat=new T.MeshBasicMaterial({color:'#a2edcf',transparent:true,opacity:.9,depthWrite:false});dynamicGeometry.push(focusGeo);dynamicMaterials.push(focusMat);const focusRing=new T.Mesh(focusGeo,focusMat);focusRing.rotation.x=-Math.PI/2;scene.add(focusRing);
        const fxGeo = new T.RingGeometry(8, 10, 32);
        fxGeo.rotateX(-Math.PI / 2);
        dynamicGeometry.push(fxGeo);
        const fx = Array.from({ length: 24 }, () => { const m = new T.MeshBasicMaterial({ color: '#a6e4d1', transparent: true, depthWrite: false, side: T.DoubleSide }); dynamicMaterials.push(m); const mesh = new T.Mesh(fxGeo, m); scene.add(mesh); mesh.visible = false; return mesh; });
        const trainers={A:createTrainer('A'),B:createTrainer('B')};scene.add(trainers.A.root,trainers.B.root);
        let cameraDistance=CHASE.distance;
        const attackTrails=new Map<string,T.Line<T.BufferGeometry,T.LineBasicMaterial>>();
        const billboardUp=new T.Vector3();
        const groundBillboard=(mesh:T.Mesh,x:number,z:number,height:number,pivot=1)=>{billboardUp.set(0,1,0);mesh.position.set(x,.5,z).addScaledVector(billboardUp,height*(pivot-.5));};
        const motionData=new Map<string,{position:Vec;travel:number;speed:number;heading:number}>();
        const effectMaterial=new T.MeshBasicMaterial({color:'#b9a0e7',transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide});dynamicMaterials.push(effectMaterial);
        const effects=new Map<string,T.Mesh<T.RingGeometry,T.MeshBasicMaterial>>();
        let frame = 0, last = performance.now(), fpsAt = last, frames = 0, lastScreen = '', visual = { ...latest.current.state.players[latest.current.role].position }, previous = { ...visual }, walk = 0, steps = 0, travelled = 0, cpu = 0, samples = 0, quality = '', w = 0, h = 0;
        const unlock = () => void audio.unlock(latest.current.settings || defaultPresentation), unlockSettings = (e: Event) => void audio.unlock((e as CustomEvent<PresentationSettings>).detail);
        const enabled = () => latest.current.inputEnabled && !document.hidden;
        const blur = () => audio.configure(latest.current.settings || defaultPresentation, !document.hidden);
        const contextLost = (e: Event) => { e.preventDefault(); latest.current.onFailure(); };
        const intent = () => { const v = latest.current, p = v.state.players[v.role]; audio.play('submitted', p.position, p.position, v.yaw); timeline.push('submitted', p.position, 'Transmitting', performance.now()); };

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
            camera.fov = o.fov;
            camera.updateProjectionMatrix();
            for(const fixture of facility.fixtures)fixture.rotation.z=o.reducedMotion?0:Math.sin(now*.0007)*.045;
            const moved = distance(previous, p.position);
            if (moved < 50) {
                travelled += moved;
                steps += moved;
            }
            previous = { ...p.position };
            walk += (moved < 50 ? moved : 0) * .085;
            const blend=1-Math.exp(-25*dt);
            visual=movementPrediction.step(s,v.role,network.getMovementStatus(),now,dt,enabled());
            canvas.dataset.renderPlayerX=String(visual.x);canvas.dataset.renderPlayerY=String(visual.y);canvas.dataset.predictionError=String(movementPrediction.error);
            const cues = timeline.observe(s, v.role, now);
            for (const cue of cues) {
                if(!['materialize','emergency'].includes(cue.kind)&&!(['impact','resolved'].includes(cue.kind)&&s.threats.some(t=>t.battle&&distance(t.position,cue.position)<1)))audio.play(cue.kind, cue.position, p.position, v.yaw);
                window.dispatchEvent(new CustomEvent('ghost-feedback', { detail: cue }));
            }
            const active = timeline.active(now), shake = !o.reducedMotion ? active.filter(c => c.kind === 'impact').reduce((n, c) => n + (1 - cueProgress(c, now)) * .3 * o.cameraShake, 0) : 0;
            const first=v.cameraMode!=='third-person',rig=first?firstPersonPose(visual,v.yaw,v.pitch):chasePose(visual,v.yaw,v.pitch,o.cameraDistance,cameraDistance||CHASE.distance,dt,s);cameraDistance=rig.distance;canvas.dataset.handsVisible='false';canvas.dataset.handCount='0';camera.near=.8;camera.updateProjectionMatrix();
            camera.position.set(rig.position.x,rig.position.y,rig.position.z);camera.lookAt(rig.target.x,rig.target.y,rig.target.z);
            canvas.dataset.camera=first?'first-person':'third-person';canvas.dataset.cameraRig=first?'eye-level':'shoulder-chase';canvas.dataset.yaw=String(v.yaw);canvas.dataset.pitch=String(rig.pitch);canvas.dataset.cameraDistance=String(rig.distance);canvas.dataset.cameraHeight=String(rig.position.y);canvas.dataset.decor=JSON.stringify(facility.damage.stats);canvas.dataset.structure=JSON.stringify({walls:facility.structure.walls.length,floorTiles:facility.structure.floorTiles.length,decorativeDoorFrames:facility.structure.decorativeDoorFrames});
            facility.damage.update(s.worldTime,o.reducedMotion,o.reducedFlashes,o.quality);facility.identity.update(s.worldTime,o.reducedMotion||o.reducedFlashes);canvas.dataset.roomIdentity=JSON.stringify(facility.identity.stats);
            const black = s.emergencies.some(e => e.status === 'active' && e.kind === 'blackout' && ['either', 'both', v.role].includes(e.scope)), danger = s.threats.find(t => t.status === 'active' && s.worldTime >= t.activeAt && !t.disabledEffect && distance(t.position, p.position) < 210);
            hemi.intensity = black ? .38 : 1.35;
            sun.intensity = black ? .06 : .25;
            renderer.toneMappingExposure = o.brightness * (o.postProcessing ? 1.16 : 1.3);
            const fog = scene.fog as T.FogExp2;
            fog.density = danger?.behavior === 'fog' ? .008 : o.postProcessing ? .00085 : 0;
            fog.color.set(danger?.behavior === 'fatigue' ? '#443342' : danger?.behavior === 'frost' ? '#6d8890' : '#263238');
            scene.background = fog.color;
            const nearest = [...rooms].sort((a, b) => distance(center(a.id), p.position) - distance(center(b.id), p.position)).slice(0, 3);
            pools.forEach((light, i) => { const r = nearest[i]; light.position.set(r.x + r.w / 2, 88, r.y + r.h / 2); light.intensity = black ? 150 : 2400; });
            flash.visible = v.flashlight;
            flash.position.set(visual.x,70,visual.y);
            flash.target.position.set(visual.x + Math.cos(v.yaw) * 180, 0, visual.y + Math.sin(v.yaw) * 180);
            audio.configure(o, !document.hidden);
            canvas.dataset.audio = audio.ready ? 'running' : 'locked-or-muted';
            if (steps > 70) {
                steps %= 70;
                audio.play('step', p.position, p.position, v.yaw, p.room === 'medical' ? 'rubber' : 'metal');
            }
            for (const d of doors(s)) {
                const mesh = gateMeshes.get(d.id)!;
                const target = d.locked ? 54 : 168;
                mesh.position.y += (target - mesh.position.y) * (1 - Math.exp(-12 * dt));
            }
            const visibleObjectives = s.tasks.filter(t => !t.complete && (t.role === v.role || t.role === 'both'));
            objectiveMarkers.forEach((marker, i) => { const t = visibleObjectives[i]; marker.visible = false; if (t) {
                const pos = t.mode === 'cooperative' && v.role === 'B' ? t.secondPosition! : t.mode === 'transfer' && t.carrier ? t.destination! : t.position;
                marker.visible = distance(pos,p.position)<300;
                marker.position.set(pos.x, .9, pos.y);
            } });
            if(v.tracked){const marker=objectiveMarkers[0];marker.visible=distance(v.tracked.position,p.position)<500;marker.position.set(v.tracked.position.x,1,v.tracked.position.y);marker.scale.setScalar(1.5);for(let i=1;i<objectiveMarkers.length;i++)objectiveMarkers[i].visible=false;}else objectiveMarkers.forEach(m=>m.scale.setScalar(1));
            focusRing.visible=!!v.focus;if(v.focus)focusRing.position.set(v.focus.position.x,1.1,v.focus.position.y);canvas.dataset.focus=v.focus?.id||'';
            const desired = new Set<string>();
            const show = (key:string,id:number,pos:Vec,height:number,back:boolean,alpha=1)=>{
                if(!id||pos.x<0)return;height=pokemonAsset(id).scale;desired.add(key);let ent=entities.get(key);
                if(ent&&ent.id!==id){ent.character?.dispose();scene.remove(ent.mesh,ent.shadow);if(ent.character)scene.remove(ent.character.root);ent.mesh.material.dispose();entities.delete(key);ent=undefined;}
                if(!ent){const mat=new T.MeshStandardMaterial({transparent:true,alphaTest:.07,roughness:1,side:T.DoubleSide}),mesh=new T.Mesh(plane,mat),shadow=new T.Mesh(plane,shadowMat);shadow.rotation.x=-Math.PI/2;scene.add(mesh,shadow);ent={mesh,shadow,id,pos:{...pos}};
                    if(pokemonAsset(id).representation!=='portrait'){ent.character=createPokemonCharacter(id);scene.add(ent.character.root);}
                    entities.set(key,ent);
                }
                const gap=distance(ent.pos,pos);if(gap>800||!walkable(ent.pos,s))ent.pos={...pos};
                else if(gap>.01){const next={x:ent.pos.x+(pos.x-ent.pos.x)*blend,y:ent.pos.y+(pos.y-ent.pos.y)*blend};if(lineOfSight(ent.pos,next,s))ent.pos=move(ent.pos,{x:(pos.x-ent.pos.x)/gap,y:(pos.y-ent.pos.y)/gap},Math.min(gap*blend/185,.06),s);}
                if(!ent.character&&pokemonAsset(id).representation!=='portrait'){ent.character=createPokemonCharacter(id);scene.add(ent.character.root);}
                alpha*=key==='companion-'+v.role?firstPersonCompanionOpacity(distance(ent.pos,{x:camera.position.x,y:camera.position.z})):1;ent.mesh.userData.viewAlpha=alpha;
                const character=ent.character,ready=character?.root.userData.ready;
                ent.mesh.visible=!ready; if(!ready){const tex=pokemonTexture(id,back);ent.mesh.material.map=tex.texture;ent.mesh.material.opacity=alpha;ent.mesh.visible=tex.ready&&alpha>.01;ent.mesh.rotation.set(0,Math.atan2(camera.position.x-ent.pos.x,camera.position.z-ent.pos.y),0);const width=Math.min(height*1.7,height*tex.width/tex.height),boundedHeight=width*tex.height/tex.width;ent.mesh.scale.set(width,boundedHeight,1);groundBillboard(ent.mesh,ent.pos.x,ent.pos.y,boundedHeight);}
                if(character){character.root.visible=!!ready&&alpha>.01;character.root.position.set(ent.pos.x,0,ent.pos.y);
                    character.root.userData.cameraPosition={x:camera.position.x,z:camera.position.z};
                }
                const size=character?.spec.scale||height;ent.shadow.scale.set(size*.9,size*.6,1);ent.shadow.position.set(ent.pos.x,.55,ent.pos.y);ent.shadow.visible=o.shadows&&alpha>.1;
            };
            const moving=(key:string,pos:Vec)=>{let m=motionData.get(key);if(!m){m={position:{...pos},travel:0,speed:0,heading:0};motionData.set(key,m);}const d=distance(pos,m.position);if(d<80){if(d>.1)m.heading=Math.atan2(pos.y-m.position.y,pos.x-m.position.x);m.travel+=d;m.speed+=(d/Math.max(dt,.001)-m.speed)*(1-Math.exp(-14*dt));}else{m.travel=0;m.speed=0;}m.position={...pos};return m;};
            for (const r of ['A','B'] as const) {
                const player=s.players[r],m=moving('trainer-'+r,r===v.role?visual:player.position),state=animationState(player,s.worldTime,s.paused?0:m.speed,s.phase==='success');
                const trainer=trainers[r];trainer.root.visible=r!==v.role||!first;trainer.root.position.x=r===v.role?visual.x:player.position.x;trainer.root.position.z=r===v.role?visual.y:player.position.y;
                trainer.update(player.yaw,state,s.worldTime,m.travel,r===v.role?Math.max(.12,Math.min(1,(cameraDistance-10)/24)):1,o.reducedMotion,dt);
                const f=trainerFrame(state,s.worldTime,m.travel,player.motion?.at);canvas.dataset['trainer'+r]=f.state+':3d:'+f.frame;canvas.dataset['avatar'+r]='crewmate';
                const away=Math.cos(player.yaw)*Math.cos(v.yaw)+Math.sin(player.yaw)*Math.sin(v.yaw)>.2;
                const activeEncounter=s.threats.find(t=>t.instanceId===player.encounterId&&t.battle);if(player.team[player.selected]?.state!=='Assigned')show('companion-'+r,activeEncounter?.battle?.active.renderId??player.selected,player.follower,31,away,1);
                const mon=player.team[player.selected]?.state==='Assigned'?undefined:entities.get('companion-'+r),mm=moving('companion-'+r,player.follower),combat=s.threats.find(t=>t.instanceId===player.encounterId&&t.battle),combatMotion=combat?playerBattleMotion(s,combat):null,ms=combatMotion?.state||animationState(player,s.worldTime,s.paused?0:mm.speed,s.phase==='success'),pose=pokemonPose(ms,combatMotion?.age??s.worldTime-(player.motion?.at||0),mm.travel,o.reducedMotion);
                if(mon){const facingTarget=player.encounterId?s.threats.find(t=>t.instanceId===player.encounterId&&t.status==='active'):undefined,heading=facingTarget&&ms!=='run'?Math.atan2(facingTarget.position.y-mon.pos.y,facingTarget.position.x-mon.pos.x):mm.speed>3?mm.heading:player.yaw;mon.character?.update(heading,ms,s.worldTime,s.paused?0:dt,s.paused?0:mm.speed,combatMotion?.age??s.worldTime-(player.motion?.at||0),o.reducedMotion,mon.mesh.userData.viewAlpha??1);canvas.dataset['pokemon'+r]=ms+':'+(mon.character?.root.userData.ready?mon.character.spec.representation:'portrait-fallback');}

                let trail=attackTrails.get(r);if(!trail){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(36),3));dynamicGeometry.push(geometry);const material=new T.LineBasicMaterial({color:'#eee4c8',transparent:true,opacity:.85});dynamicMaterials.push(material);trail=new T.Line(geometry,material);attackTrails.set(r,trail);scene.add(trail);}
                const target=s.threats.find(t=>t.instanceId===player.encounterId&&t.status==='active'),types=player.team[player.selected]?.record?.types||[],age=combatMotion?.age??s.worldTime-(player.motion?.at||0);
                trail.visible=ms==='attack'&&!!target&&age<.85;
                if(target&&trail.visible){const positions=trail.geometry.getAttribute('position');for(let j=0;j<12;j++){const u=j/11,flare=Math.sin(u*Math.PI),zig=types.includes('electric')?(j%2?5:-5)*flare:types.includes('fire')?Math.sin(j*2+age*24)*flare*5:0;positions.setXYZ(j,player.follower.x+(target.position.x-player.follower.x)*u+zig,12+flare*(types.includes('water')?24:types.includes('grass')?9:15),player.follower.y+(target.position.y-player.follower.y)*u+zig);}positions.needsUpdate=true;trail.material.color.set(attackColor(types));trail.material.opacity=Math.max(0,1-age/.85);}
                let effect=effects.get(r);if(!effect){const mat=effectMaterial.clone();dynamicMaterials.push(mat);effect=new T.Mesh(fxGeo,mat);effects.set(r,effect);scene.add(effect);}
                effect.visible=!!pose.effect&&!!mon;effect.position.set(player.follower.x,1,player.follower.y);effect.scale.setScalar(pose.effect==='shield'?2.2:1.4+pose.intensity*2);effect.material.color.set(pose.effect==='attack'?attackColor(player.team[player.selected]?.record?.types):pose.effect==='rest'?'#94dfaf':pose.effect==='shield'?'#88d5f2':'#cf9be9');effect.material.opacity=.25+pose.intensity*.4;
            }
            for(const [gateId,hold] of Object.entries(s.route.holds)){const pos=gateControl(gateId),key='held-'+gateId;show(key,hold.pokemon,pos,31,false);entities.get(key)?.character?.update(s.players[hold.role].yaw,'assist',s.worldTime,s.paused?0:dt,0,s.worldTime,o.reducedMotion);}
            for(const r of ['A','B'] as const){const player=s.players[r];if(player.assigned&&player.assignmentTarget){const target=s.tasks.find(t=>t.id===player.assignmentTarget)||s.emergencies.find(e=>e.id===player.assignmentTarget);if(target){const key='assigned-'+r;show(key,player.assigned,target.position,31,false);entities.get(key)?.character?.update(player.yaw,'assist',s.worldTime,s.paused?0:dt,0,s.worldTime,o.reducedMotion);}}}
            for(const t of s.threats.filter(t=>t.status==='active'||t.resolvedAt!==null&&s.elapsed-t.resolvedAt<1.2)){
                const resolving=t.status!=='active',alpha=resolving?Math.max(0,1-(s.elapsed-t.resolvedAt!)/1.2):Math.max(.2,Math.min(1,1-(t.activeAt-s.worldTime)/3));show(t.instanceId,t.battle?.opponent.renderId??t.id,t.position,44,false,alpha);
                const cue=threatPresentation(s,t),target=threatFacingTarget(s,t),movement=moving(t.instanceId,t.position),character=entities.get(t.instanceId)?.character;character?.update(Math.atan2(target.y-t.position.y,target.x-t.position.x),cue.state==='idle'&&movement.speed>3?'run':cue.state,s.worldTime,s.paused?0:dt,s.paused?0:movement.speed,cue.age,o.reducedMotion,alpha);
                let aura=effects.get(t.instanceId);if(!aura){const mat=effectMaterial.clone();dynamicMaterials.push(mat);aura=new T.Mesh(fxGeo,mat);effects.set(t.instanceId,aura);scene.add(aura);}aura.visible=true;aura.position.set(t.position.x,1.2,t.position.y);aura.scale.setScalar(1.5+(o.reducedMotion?0:Math.sin(s.worldTime*2)*.08));aura.material.color.set(attackColor(t.types));aura.material.opacity=alpha*(.16+(o.reducedFlashes?0:Math.sin(s.worldTime*2)*.035));
            }
            for(const [key,ent]of entities)if(!desired.has(key)){ent.character?.dispose();if(ent.character)scene.remove(ent.character.root);scene.remove(ent.mesh,ent.shadow);ent.mesh.material.dispose();entities.delete(key);motionData.delete(key);const aura=effects.get(key);if(aura){scene.remove(aura);aura.material.dispose();effects.delete(key);}}
            canvas.dataset.pokemonCharacters=JSON.stringify([...entities].map(([key,e])=>({key,id:e.id,representation:e.character?.root.userData.ready?e.character.spec.representation:'portrait-fallback',state:e.character?.root.userData.state||'static',clip:e.character?.root.userData.clip,frame:e.character?.root.userData.frame,frameKey:e.character?.root.userData.frameKey,direction:e.character?.root.userData.direction,actionFallback:e.character?.root.userData.actionFallback,animationOrigin:e.character?.root.userData.animationOrigin,rigJoints:e.character?.root.userData.rigJoints,clipTime:e.character?.root.userData.clipTime||0,position:e.pos,pose:e.character?.root.userData.pose})));
            canvas.dataset.assetCache=JSON.stringify(characterAssets.diagnostics);
            fx.forEach((mesh, i) => { const c = active[i]; mesh.visible = !!c && c.kind !== 'step' && c.kind !== 'radio' && c.kind !== 'submitted'; if (c) {
                const progress = cueProgress(c, now);
                mesh.position.set(c.position.x, 1 + i * .015, c.position.y);
                mesh.scale.setScalar(1 + progress * 4);
                mesh.material.opacity = (1 - progress) * .65;
                mesh.material.color.set(c.kind === 'impact' ? '#e8ac81' : c.kind === 'materialize' ? '#b9a0e7' : '#a6e4d1');
            } });
            renderer.autoClear=true;
            renderer.render(scene,camera);
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
        return () => { disposed = true;imageTimers.forEach(clearTimeout);imageTimers.clear(); cancelAnimationFrame(frame); for(const ent of entities.values()){ent.character?.dispose();ent.mesh.material.dispose();}characterAssets.clearUnused(); trainers.A.dispose();trainers.B.dispose();facility.dispose(); dynamicGeometry.forEach(g => g.dispose()); dynamicMaterials.forEach(m => m.dispose()); dynamicTextures.forEach(t => t.dispose()); flash.shadow.dispose(); renderer.dispose();  document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); window.removeEventListener('ghost-audio-unlock', unlockSettings); window.removeEventListener('ghost-intent', intent); window.removeEventListener('blur', blur); canvas.removeEventListener('webglcontextlost', contextLost); };
    }, []);
    return <><canvas ref={ref} className="third-person" aria-label="Third-person research facility" tabIndex={0} onClick={()=>ref.current?.focus({preventScroll:true})}/><div className="fps-counter" aria-live="off"/></>;
}
