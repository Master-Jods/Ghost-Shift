import EmergencyMechanism from './EmergencyMechanism';
import {GAME_NAME}from './branding';
import {playerProfile,PROFILE_ERROR,type PlayerProfile}from './playerProfile';
import {DangerAlert} from './DangerAlert';
import DoorControls from './DoorControls';
import {channelLabels,taskTarget} from './taskLabels';
import {clampPitch,CHASE} from './chaseCamera';
import TaskMechanism from './TaskMechanism';
import HorrorTitle from './HorrorTitle';
import {FieldManual,FieldBriefing} from './FieldManual';
import {FieldAnalyst,ConsequenceToast} from './FieldAnalyst';
import {EncounterPanel} from './EncounterPanel';
import {taskChoices,taskChoiceCheck} from './taskChoices';
import {BRIEFING_VERSION} from './engine';
import { useState, useRef, useEffect, useSyncExternalStore, lazy, Suspense } from 'react';
import { network, transport } from './transport';
import { navigate, useRoute } from './router';
import { fmt } from './data';
import { PokemonPicker, MonImage } from './PokemonPicker';
import { titleCase, THREAT_LIBRARY, EMERGENCIES } from './content';
import { activeThreats, activeEmergencies, extractionReady, emergencyLocation, type Task, type Emergency, type Threat } from './engine';
import { distance, pathLength, lineOfSight, roomName, center, type Vec } from './world';
import { loadPresentation, savePresentation, type PresentationSettings } from './presentation';
import { PresentationSettingsPanel, ActionFeedback } from './PresentationUI';
const preloadWorld=()=>import('./ThirdPerson');
const ThirdPerson = lazy(preloadWorld);
import PlayerMinimap from './PlayerMinimap';
import { ServerAdvice } from './NetworkUI';
import { copyText } from './clipboard';
import { objectives } from './objectives';
import {TaskTracker,TaskJournal} from './TaskUI';
import {journalTabIntent,cameraInput} from './gameInput';
import CollisionDebug from './CollisionDebug';
type Focus = {
    kind: 'task';
    value: Task;
} | {
    kind: 'emergency';
    value: Emergency;
} | {
    kind: 'threat';
    value: Threat;
};
export default function PlayerApp() {
    const [cameraMode,setCameraMode]=useState<'first-person'|'third-person'>('first-person');
    const [registration,setRegistration]=useState<PlayerProfile>({fullName:'',block:'',groupNumber:''});
    const s = useSyncExternalStore(transport.subscribe, transport.getSnapshot), net = useSyncExternalStore(transport.subscribe, network.getNetSnapshot), route = useRoute(), params = new URLSearchParams(location.search), role = (net.role === 'A' || net.role === 'B' ? net.role : params.get('role') === 'B' ? 'B' : 'A') as 'A' | 'B', other = role === 'A' ? 'B' : 'A', p = s.players[role];
    const [slot, setSlot] = useState<'A' | 'B'>(params.get('role') === 'B' ? 'B' : 'A'), [code, setCode] = useState(params.get('code') || ''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [team, setTeam] = useState<number[]>([]), [overlay, setOverlay] = useState<'team' | 'settings' | 'objectives' | 'journal' | 'help' | 'briefing' | 'advice' | 'signals' | 'doors' | Focus | null>(null), [yaw, setYaw] = useState(-Math.PI/2), [pitch,setPitch]=useState(CHASE.pitch), [light, setLight] = useState(true), [reduced, setReduced] = useState(localStorage.getItem('gs-reduced') === '1'), [hint, setHint] = useState('');
    const [facilityStatus,setFacilityStatus]=useState<'checking'|'online'|'offline'>('checking');
    const teamDirty=team.length!==Object.keys(p.team).length||team.some(id=>!p.team[id]);
    const [tracked,setTracked]=useState<string|null>(null);
    const journalItems=objectives(s,role),trackedObjective=journalItems.find(o=>o.id===tracked);
    useEffect(()=>{setTracked(null);},[s.id,role]);
    useEffect(()=>{if(!tracked||!journalItems.some(o=>o.id===tracked&&!o.complete))setTracked(s.tasks.find(t=>!t.complete&&(t.role===role||t.role==='both'))?.id||journalItems.find(o=>!o.complete)?.id||null);},[s.revision,tracked,role]);
    const [presentation, setPresentation] = useState<PresentationSettings>(loadPresentation);
    const decision = useSyncExternalStore(transport.subscribe, network.getDecisionSnapshot);
    const keys = useRef(new Set<string>()), stick = useRef<Vec>({ x: 0, y: 0 }), stickBase = useRef<Vec | null>(null), lookTouch = useRef<Vec | null>(null), live = useRef({ s, overlay, yaw, role });
    live.current = { s, overlay, yaw, role };
    const isEntry = route === '/' || route.split('?')[0] === '/play', isLobby = route.includes('/lobby'), isGame = !isEntry && !isLobby;
    useEffect(()=>{if(!isEntry)return;let live=true;const check=()=>{void fetch('/api/health',{signal:AbortSignal.timeout(5000),cache:'no-store'}).then(r=>{if(!r.ok)throw Error('offline');if(live)setFacilityStatus('online');}).catch(()=>{if(live)setFacilityStatus('offline');});};check();const timer=setInterval(check,15000);return()=>{live=false;clearInterval(timer);};},[isEntry]);
    useEffect(()=>{if(isLobby)void preloadWorld().catch(()=>{});},[isLobby]);
    const [visualPreparation,setVisualPreparation]=useState('');
    const companionPrefetchKey=[...new Set([...team,...Object.keys(s.players[other].team).map(Number)])].sort((a,b)=>a-b).join(',');
    useEffect(()=>{if(!isLobby||!companionPrefetchKey)return;let active=true,release:(()=>void)|undefined;const cancellation=new AbortController();setVisualPreparation('Preparing companion appearances. You can continue; a reference appearance remains available.');void import('./pokemonCharacter').then(m=>m.prefetchPokemon(companionPrefetchKey.split(',').map(Number),cancellation.signal)).then(result=>{if(!active){result.release();return;}release=result.release;setVisualPreparation('Companion appearances prepared.');}).catch(()=>{if(active)setVisualPreparation('Reference appearances ready.');});return()=>{active=false;cancellation.abort();release?.();};},[isLobby,companionPrefetchKey]);

    const ownTasks = s.tasks.filter(t=>!t.complete).sort((a,b)=>Number(b.role===role)-Number(a.role===role)), emergencies = activeEmergencies(s), threats = activeThreats(s);
    const taskPosition=(t:Task)=>t.mode==='cooperative'&&role==='B'?t.secondPosition!:t.mode==='transfer'&&t.carrier?t.destination!:t.position;
    const candidates: ({
        focus: Focus;
        position: Vec;
    })[] = [...ownTasks.map(t => ({ focus: { kind: 'task' as const, value: t }, position: t.mode === 'cooperative' && role === 'B' ? t.secondPosition! : t.mode === 'transfer' && t.carrier ? t.destination! : t.position })), ...emergencies.filter(e => ['both', 'either', role].includes(e.scope)).map(e => ({ focus: { kind: 'emergency' as const, value: e }, position: emergencyLocation(e,role) })), ...threats.map(t => ({ focus: { kind: 'threat' as const, value: t }, position: t.position }))];
    const targeted = candidates.filter(c => distance(c.position, p.position) < (c.focus.kind === 'threat' ? 140 : 85) && lineOfSight(p.position, c.position, s)).sort((a, b) => { if(a.focus.kind==='task'&&b.focus.kind==='task'&&a.focus.value.id!==b.focus.value.id){if(a.focus.value.id===tracked)return -1;if(b.focus.value.id===tracked)return 1;} const da = distance(a.position, p.position), db = distance(b.position, p.position); if (Math.abs(da - db) < 40 && a.focus.kind !== b.focus.kind)
        return (a.focus.kind === 'emergency' ? -1 : a.focus.kind === 'task' ? 1 : 0) - (b.focus.kind === 'emergency' ? -1 : b.focus.kind === 'task' ? 1 : 0); return da - db; })[0];
    function open(value: typeof overlay) { if(value!==null&&document.pointerLockElement)void document.exitPointerLock();keys.current.clear(); stick.current = { x: 0, y: 0 }; lookTouch.current=null; stickBase.current=null; if(s.phase==='playing'&&net.connected)transport.dispatch({ type: 'INPUT', value: { x: 0, y: 0 }, role }); live.current.overlay=value;setOverlay(value);if(s.phase==='playing'&&net.connected)void network.command('TASK_FOCUS',value&&typeof value==='object'&&value.kind!=='threat'?value.value.id:null).catch(()=>{}); if(value!==null)requestAnimationFrame(()=>document.querySelector<HTMLElement>('.equipment-terminal[role="dialog"]')?.focus({preventScroll:true})); if (value === null)
        requestAnimationFrame(() => { const canvas = document.querySelector<HTMLCanvasElement>('.third-person'); if (canvas) {
            canvas.tabIndex = 0;
            canvas.focus({ preventScroll: true });
        } }); }
    function interact() { if (!targeted) {
        setHint('Face a nearby research terminal or encounter.');
        return;
    } if (targeted.focus.kind === 'threat') {
        if(p.encounterId!==targeted.focus.value.instanceId)transport.dispatch({ type: 'ENCOUNTER', role, value: targeted.focus.value.instanceId });
        open(targeted.focus);
    }
    else
        open(targeted.focus); }
    async function action(type: string, value?: unknown) { window.dispatchEvent(new CustomEvent('ghost-intent')); try {
        await network.command(type, value);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }
    async function join() { if (busy)
        return; setBusy(true); try {
        const profile=playerProfile(registration);if(!profile)throw Error(PROFILE_ERROR);await network.join(slot, code.trim(),profile);
        navigate(`/play/lobby?role=${slot}`);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    useEffect(() => { document.body.classList.add('ghost-player'); return () => document.body.classList.remove('ghost-player'); }, []);
    useEffect(() => { if (hint) {
        const timeout = setTimeout(() => setHint(''), 5000);
        return () => clearTimeout(timeout);
    } }, [hint]);
    useEffect(() => { setYaw(-Math.PI/2);setPitch(CHASE.pitch); setTeam(Object.keys(p.team).map(Number)); }, [s.id, role]);
    useEffect(() => { if (['countdown', 'playing'].includes(s.phase))
        setHint(''); if (isLobby && ['countdown', 'playing'].includes(s.phase))
        navigate(`/play/session/${s.id}?role=${role}`); }, [isLobby, s.phase, s.id]);
    useEffect(() => { localStorage.setItem('gs-reduced', reduced ? '1' : '0'); }, [reduced]);
    useEffect(() => { if (!hint)
        return; const t = setTimeout(() => setHint(''), 4500); return () => clearTimeout(t); }, [hint]);
    useEffect(() => { savePresentation(presentation); setReduced(presentation.reducedMotion); }, [presentation]);
    const inputActions = useRef({ interact, open });
    inputActions.current = { interact, open };
    useEffect(() => { if (decision) {
        if(document.pointerLockElement)void document.exitPointerLock();
        keys.current.clear();
        stick.current = { x: 0, y: 0 };
        stickBase.current=null;lookTouch.current=null;
        transport.dispatch({type:'INPUT',role,value:{x:0,y:0}});
    } }, [!!decision]);
    useEffect(() => { if (!isGame)
        return; const down = (e: KeyboardEvent) => { const k = e.key.toLowerCase();
    const active=document.activeElement as HTMLElement|null,typing=!!(e.target as HTMLElement)?.closest('input,select,textarea,[contenteditable="true"]');
    if(k==='tab'){
      const view=live.current.overlay,intent=journalTabIntent({playing:live.current.s.phase==='playing',typing,modified:e.shiftKey||e.ctrlKey||e.altKey||e.metaKey,overlay:typeof view==='string'?view:view?'interaction':null,gameSurface:active?.matches('.third-person,body,html')===true,journalSurface:active?.matches('.equipment-terminal[data-journal="true"]')===true});
      if(intent&&!network.getDecisionSnapshot()){e.preventDefault();if(!e.repeat)inputActions.current.open(intent==='open'?'journal':null);}return;
    }
 if (k === 'escape') {
        inputActions.current.open(null);
        return;
    } if (typing) return; if (network.getDecisionSnapshot() || live.current.overlay)
        return; if(k==='9'&&!e.repeat){e.preventDefault();setCameraMode(v=>v==='first-person'?'third-person':'first-person');return;} if (k === 'e' && !e.repeat) {
        inputActions.current.interact();
        return;
    } if (k === 'q' && !e.repeat) {
        inputActions.current.open('team');
        return;
    } if (k === 'm' && !e.repeat) {
        inputActions.current.open('objectives');
        return;
    } if (k === 'f' && !e.repeat) {
        setLight(v => !v);
        return;
    } if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
        keys.current.add(k);
        if(!e.repeat)sendMovement();
    } }; const up = (e: KeyboardEvent) => {if(keys.current.delete(e.key.toLowerCase()))sendMovement();}, blur = () => { const moving = keys.current.size > 0 || Math.hypot(stick.current.x, stick.current.y) > .01; keys.current.clear(); stick.current = { x: 0, y: 0 };stickBase.current=null;lookTouch.current=null; if (moving && network.getNetSnapshot().connected)
        transport.dispatch({ type: 'INPUT', role, value: { x: 0, y: 0 } }); }; const visibility = () => { if (document.hidden)
        blur(); }; document.addEventListener('visibilitychange', visibility); window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); let lastDirection={x:0,y:0};const sendMovement=() => { const { s, overlay, yaw, role } = live.current; if (overlay || network.getDecisionSnapshot() || s.phase !== 'playing' || s.paused || s.players[role].exit || !network.getNetSnapshot().connected)
        return; let forward = (keys.current.has('w') || keys.current.has('arrowup') ? 1 : 0) - (keys.current.has('s') || keys.current.has('arrowdown') ? 1 : 0) - stick.current.y, strafe = (keys.current.has('d') || keys.current.has('arrowright') ? 1 : 0) - (keys.current.has('a') || keys.current.has('arrowleft') ? 1 : 0) + stick.current.x; const length = Math.max(1, Math.hypot(forward, strafe)); forward /= length; strafe /= length; const direction=cameraInput(forward,strafe,yaw);const changed=Math.abs(direction.x-lastDirection.x)>.001||Math.abs(direction.y-lastDirection.y)>.001;if(!changed&&Math.hypot(direction.x,direction.y)<.01)return;if(changed&&Math.hypot(direction.x,direction.y)>.01){const facing=Math.atan2(direction.y,direction.x);transport.dispatch({type:'LOOK',role,value:facing});}transport.dispatch({type:'INPUT',role,value:direction});lastDirection=direction;};const timer=setInterval(sendMovement,100); return () => { clearInterval(timer); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); }; }, [isGame]);
    useEffect(()=>{const sync=(e:Event)=>setPresentation((e as CustomEvent<PresentationSettings>).detail);window.addEventListener('ghost-audio-unlock',sync);return()=>window.removeEventListener('ghost-audio-unlock',sync);},[]);
    const cameraPrefs=useRef(presentation);cameraPrefs.current=presentation;
    useEffect(()=>{if(!isGame)return;let pointer:number|null=null,lastPoint={x:0,y:0};const allowed=()=>!live.current.overlay&&!network.getDecisionSnapshot()&&live.current.s.phase==='playing'&&!live.current.s.paused;
      const rotate=(dx:number,dy:number,touch=false)=>{if(!allowed())return;const o=cameraPrefs.current,k=touch?o.touchSensitivity:o.sensitivity;setYaw(v=>v+dx*k);setPitch(v=>clampPitch(v+dy*k*(o.invertY?-1:1)));};
      const down=(e:PointerEvent)=>{if(!allowed()||!(e.target as Element)?.closest('.third-person'))return;if(e.pointerType==='touch'||e.button===2){pointer=e.pointerId;lastPoint={x:e.clientX,y:e.clientY};(e.target as HTMLElement).setPointerCapture(e.pointerId);}else if(e.button===0)void (e.target as HTMLElement).requestPointerLock?.();};
      const move=(e:PointerEvent)=>{if(pointer===e.pointerId){rotate(e.clientX-lastPoint.x,e.clientY-lastPoint.y,e.pointerType==='touch');lastPoint={x:e.clientX,y:e.clientY};}};
      const mouse=(e:MouseEvent)=>{if(document.pointerLockElement?.matches('.third-person'))rotate(e.movementX,e.movementY);};const up=()=>{pointer=null;};const context=(e:MouseEvent)=>{if((e.target as Element)?.closest('.third-person'))e.preventDefault();};
      document.addEventListener('pointerdown',down);document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);document.addEventListener('mousemove',mouse);document.addEventListener('contextmenu',context);window.addEventListener('blur',up);
      return()=>{document.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);document.removeEventListener('mousemove',mouse);document.removeEventListener('contextmenu',context);window.removeEventListener('blur',up);};
    },[isGame]);
    async function fullscreen() { try {
        if (document.fullscreenElement)
            await document.exitFullscreen();
        else
            await document.documentElement.requestFullscreen();
    }
    catch {
        setHint('Fullscreen unavailable. Landscape browser play remains available.');
    } }
    function companion(command: string, t: Threat) { window.dispatchEvent(new CustomEvent('ghost-intent')); transport.dispatch({ type: 'COMPANION', role, value: { id: t.instanceId, action: command } }); }
    function taskPanel(t: Task) { const current = s.tasks.find(v => v.id === t.id)!; t=current; const submit = (answer: unknown) => {window.dispatchEvent(new CustomEvent('ghost-intent'));return network.command('TASK_INPUT', { id: t.id, answer }).then(()=>setError(''));}; const choices=taskChoices(current);if(choices.length&&!current.option)return <section className="task-options"><span className="eyebrow">MAJOR TASK DECISION / TRAINER {t.role}</span><h2>{t.name}</h2><p>Choose how to restore this station. Inspect guaranteed costs and compare actual-rule forecasts before confirming.</p><div className="task-choice-grid">{choices.map(c=>{const check=taskChoiceCheck(s,current,role,c.id);return <article key={c.id}><h3>{c.name}</h3><b>Choose which shortcut receives power</b><ul>{c.effects.map(e=><li key={e}>{e}</li>)}</ul><button className="primary" disabled={!check.ok} onClick={()=>void network.requestPreview('TASK_OPTION',{id:t.id,option:c.id})}>Preview {c.name.toLowerCase()}</button>{!check.ok&&<p>{check.reason}</p>}</article>;})}</div></section>; if (current.complete)
        return <div className="task-completion"><span className="eyebrow">RESEARCH SAVED</span><h2>Assignment complete</h2><p>{t.name} is recorded in the research log.</p><div className="consequence-receipt">{s.receipts?.find(r=>r.changes.some(c=>c.includes(t.name)))?.changes.map(c=><p key={c}>{c}</p>)}</div><button className="primary" onClick={() => open(null)}>Return to facility</button></div>; return <><span className="eyebrow">RESEARCH ASSIGNMENT / {t.role === 'both' ? 'COOPERATIVE' : `TRAINER ${t.role}`}</span><h2>{t.name}</h2><TaskMechanism key={t.id} task={current} time={s.worldTime} role={role} onInput={submit}/>
{t.mode==='wiring'&&<button disabled={t.assisted} onClick={() => transport.dispatch({ type: 'ASSIST_TASK', role, value: t.id })}>Assign companion to one wire</button>}</>; }
    function emergencyPanel(original: Emergency) {const e=s.emergencies.find(v=>v.id===original.id)!;return <EmergencyMechanism key={e.id} emergency={e} state={s} role={role} onRespond={answer=>{window.dispatchEvent(new CustomEvent('ghost-intent'));return network.command('RESPOND',{id:e.id,...answer}).then(()=>setError(''));}} onRequest={plan=>transport.dispatch({type:'REQUEST',role,value:{eventId:e.id,plan}})}/>;}
    function threatPanel(original:Threat){const t=s.threats.find(v=>v.instanceId===original.instanceId);return t?<EncounterPanel state={s} role={role} threat={t} onAction={async command=>{window.dispatchEvent(new CustomEvent('ghost-intent'));await network.command('COMPANION',{id:t.instanceId,action:command});}} onRetreat={()=>{if(p.encounter)void action('LEAVE_ENCOUNTER');open(null);}}/>:<p>Encounter is no longer present.</p>;}
    const settingsDialog = ['settings','help','briefing'].includes(String(overlay)) && <div className="modal-backdrop terminal-backdrop"><section className="modal equipment-terminal utility-dialog" role="dialog" aria-label={`${overlay} overlay`}><button className="close" aria-label="Close overlay" onClick={()=>open(null)}>×</button>{overlay==='help'?<FieldManual/>:overlay==='briefing'?<FieldBriefing state={s} role={role} onReady={()=>{void network.command('ACK_BRIEFING',BRIEFING_VERSION).then(()=>open(null)).catch(e=>setError(e.message));}}/>:<PresentationSettingsPanel value={presentation} onChange={value=>{setPresentation(value);window.dispatchEvent(new CustomEvent('ghost-audio-unlock',{detail:value}));}}/>}{error&&<p role="alert" className="error">{error}</p>}</section></div>;
    if (isEntry)
        return <div className={`player-entry horror-entry ${presentation.reducedMotion?'motion-reduced':''}`}><div className="title-scene" aria-hidden="true"/><div className="scene-haze" aria-hidden="true"/><header><a href="/play" className="wordmark">ASTER <b>/ NIGHT OPERATIONS</b></a><span className={`facility-status ${facilityStatus}`} role="status"><i/> {facilityStatus==='online'?'FACILITY SERVER ONLINE':facilityStatus==='offline'?'SERVER UNREACHABLE · RETRYING':'CHECKING FACILITY LINK…'}</span></header><main><div className="title-menu"><span className="eyebrow">A COOPERATIVE SURVIVAL RESEARCH GAME</span><HorrorTitle/><p className="title-tagline">The night shift was supposed to be quiet.<br/>Bring your Pokémon. Leave together.</p><nav className="title-navigation" aria-label="Main menu"><button className="title-join" onClick={()=>{document.getElementById('shift-code')?.focus();}}>Join Shift <span aria-hidden="true">01</span></button><button onClick={()=>open('help')}>How to Play <span aria-hidden="true">02</span></button><button aria-label="Settings" onClick={()=>open('settings')}>Settings <span aria-hidden="true">03</span></button><a href="/operator">Operator Access <span>↗</span></a></nav><section className="join-card"><div className="join-heading"><span className="eyebrow">CLOCK IN / JOIN A LIVE SHIFT</span><small>2 TRAINERS · 5 MINUTES</small></div><div className="role-buttons">{(['A','B'] as const).map(r=><button className={slot===r?'selected':''} onClick={()=>setSlot(r)} key={r}>TRAINER {r}</button>)}</div><div className="player-registration"><label>Full Name<input autoComplete="name" required maxLength={100} value={registration.fullName} onChange={e=>setRegistration({...registration,fullName:e.target.value})}/></label><label>Block<input required maxLength={50} value={registration.block} onChange={e=>setRegistration({...registration,block:e.target.value})} placeholder="e.g. BSIT 3-1"/></label></div><label htmlFor="shift-code">Session code</label><div className="join-input"><input id="shift-code" aria-label="Session code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="GS-XXXXXX" maxLength={16}/><button className="primary" disabled={busy||!code||!playerProfile(registration)} aria-label="JOIN SERVER SESSION" onClick={join}>{busy?'Connecting…':'ENTER →'}</button></div>{error&&<p className="error" role="alert">{error}</p>}{net.authenticated&&net.role!=='control'&&<button onClick={()=>navigate(`/play/${s.phase==='lobby'?'lobby':`session/${s.id}`}?role=${role}`)}>Resume owned slot</button>}<small>Get your shift code from the operator. No threats until the Director intervenes.</small></section></div><div className="scene-caption" aria-hidden="true"><span>CONTAINMENT WING / 03:17 AM</span><b>Something is still inside.</b></div></main><footer><span>FIRST PERSON · WASD / TOUCH · E INTERACT</span><span>HEADPHONES RECOMMENDED · SOUND STARTS AFTER INTERACTION</span><a href="/operator">Operator control ↗</a></footer>{settingsDialog}</div>;
    if (isLobby)
        return <div className="lobby-page"><header><a href="/play">← Player entry</a><span className="wordmark">POKÉMON <b>{GAME_NAME.toUpperCase()}</b></span><button aria-label="Settings" onClick={()=>open('settings')}>Settings</button><button onClick={fullscreen}>Fullscreen</button><button onClick={()=>open('help')}>How to play</button></header><main><span className="eyebrow">BRIEFING IS OUTSIDE ACTIVE MISSION TIME</span><h1>Assemble your night crew.</h1><p>Choose three companions. Every species can help. Finalize your team, then review the required field briefing before the operator starts.</p><div className="lobby-strip"><b>ROOM {s.code}</b><span>Trainer {role}: {p.teamFinalized&&teamDirty?'UNSAVED TEAM CHANGES':p.teamFinalized ? 'TEAM FINALIZED' : 'SELECT THREE'}</span><span>Partner: {s.players[other].ready ? 'READY' : net.presence[other].connected ? 'CHOOSING TEAM' : 'NOT CONNECTED'}</span><span>Deadline {fmt(s.config.duration)}</span></div><PokemonPicker selected={team} onChange={setTeam}/>{visualPreparation&&<p role="status">{visualPreparation}</p>}<p><a href="/pokemon-models/SOURCES.html" target="_blank" rel="noreferrer">3D model sources</a> / <a href="/pokemon-sprites/CREDITS.html" target="_blank" rel="noreferrer">Animation artists and sources</a></p>{error && <p className="error" role="alert">{error}</p>}<div className="sticky-ready"><button className="primary" disabled={team.length !== 3 || busy || s.phase !== 'lobby'} onClick={async () => { setBusy(true); try {
            await network.finalizeTeam(team);
            setHint('Team finalized. Review the field briefing, then acknowledge readiness.');
            setError('');
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        } }}>Finalize three companions</button><button disabled={!p.teamFinalized || teamDirty || s.phase !== 'lobby'} onClick={() => p.ready?void action('READY'):open('briefing')}>{p.ready ? 'Cancel readiness' : 'Read field briefing'}</button><span>Both ready → operator starts. Facility begins without threats.</span><button onClick={async () => { try {
            await copyText(`${location.origin}/play?role=${other}&code=${s.code}`);
            setHint('Partner link copied.');
        }
        catch (e) {
            setHint((e as Error).message);
        } }}>Copy partner link</button></div></main>{hint && <div className="hint" role="status">{hint}</div>}{settingsDialog}</div>;
    const nearest = s.tasks.find(t=>t.id===tracked&&!t.complete)||ownTasks[0], alert = threats.find(t => t.target === role) || threats[0], showAlert = alert ? s.elapsed - alert.createdAt < 6 : emergencies[0] ? s.elapsed - emergencies[0].createdAt < 6 : false;
    return <div className={`player-game ${presentation.reducedMotion ? 'motion-reduced' : ''}`} style={{'--hud-scale':presentation.hudScale,'--minimap-size':presentation.minimapSize+'px'} as React.CSSProperties}><Suspense fallback={<div className="world-loading">INITIALIZING FIELD EQUIPMENT</div>}><ThirdPerson cameraMode={cameraMode} pitch={pitch} state={s} role={role} yaw={yaw} inputEnabled={!overlay&&!decision} flashlight={light} reduced={reduced} settings={presentation} tracked={trackedObjective&&!trackedObjective.complete?{id:trackedObjective.id,position:trackedObjective.position}:undefined} focus={targeted ? { id: targeted.focus.kind === 'threat' ? targeted.focus.value.instanceId : targeted.focus.value.id, position: targeted.position, label: targeted.focus.value.name, kind: targeted.focus.kind } : undefined}/></Suspense><header className="player-top"><span className="wordmark">◉ <b>{GAME_NAME.toUpperCase()}</b><small>TRAINER {role} · {roomName(p.room)}</small></span><div><button onClick={fullscreen}>Fullscreen</button><button aria-label="Settings" onClick={() => open('settings')}>⚙</button></div></header><div key={p.room} className="room-entry-label">{roomName(p.room)}</div><div className="hud-right-column"><PlayerMinimap state={s} role={role} yaw={yaw} settings={presentation} tracked={tracked} onExpand={()=>open('objectives')}/><FieldAnalyst state={s} role={role} hidden={!!overlay||!!decision}/></div><TaskTracker state={s} items={journalItems} tracked={tracked} onTrack={setTracked} onJournal={()=>open('journal')}/><CollisionDebug state={s} role={role}/>{!overlay&&!decision&&<ConsequenceToast state={s}/>}<div className="mission-hud"><div><span className="eyebrow">NORMAL TASKS</span><strong>Normal Tasks: {s.tasks.filter(t => t.complete).length} / 6</strong><small>{extractionReady(s) ? 'EXTRACTION OPEN · BOTH TRAINERS REQUIRED' : nearest ? `${nearest.name} · ${roomName(roomAtPosition(taskPosition(nearest)))}` : 'Respond to extraction-blocking incidents'}</small></div><div className="deadline"><span>ACTIVE TIME REMAINING</span><strong>{fmt(Math.max(0, s.config.duration - s.elapsed))}</strong><small>{s.overrideKeys} shared override key</small></div></div><div className="partner-chip">{other} · {net.presence[other].connected ? 'CONNECTED' : 'DISCONNECTED'} · {s.players[other].exit ? 'EXTRACTED' : s.players[other].signalUntil > s.worldTime ? s.players[other].signal : 'COOPERATIVE PARTNER'}</div><aside className="emergency-tracker">{threats.map(t => <button className="threat-tracker" key={t.instanceId} onClick={() => { if (distance(p.position, t.position) < 140 && lineOfSight(p.position, t.position, s) && !p.encounter)
        if(p.encounterId!==t.instanceId)transport.dispatch({ type: 'ENCOUNTER', role, value: t.instanceId }); open({ kind: 'threat', value: t }); }}>◇ {titleCase(t.name)}<small>{roomName(roomAtPosition(t.position))} / {s.worldTime < t.activeAt ? 'materializing' : t.revealed ? 'identified' : 'unverified'}</small></button>)}{emergencies.map(e => <button key={e.id} onClick={() => open({ kind: 'emergency', value: e })}>{e.blocking ? '!' : '•'} {e.name} <small>{roomName(roomAtPosition(e.position))} / {fmt(Math.max(0, e.expiresAt - s.elapsed))} / {e.scope}</small></button>)}</aside><div className="joystick" role="application" aria-label="Touch movement joystick" onPointerDown={e => { stickBase.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!stickBase.current)
        return; const dx = (e.clientX - stickBase.current.x) / 45, dy = (e.clientY - stickBase.current.y) / 45, n = Math.max(1, Math.hypot(dx, dy)); stick.current = { x: dx / n, y: dy / n }; }} onPointerUp={() => { stick.current = { x: 0, y: 0 }; stickBase.current = null; }} onPointerCancel={() => { stick.current = { x: 0, y: 0 }; stickBase.current = null; }}><span>W</span><b>＋</b><small>A · S · D</small></div><div className="companion-hud">{Object.keys(p.team).map(Number).map(id => <button key={id} data-pokemon-id={id} className={p.selected === id ? 'selected' : ''} disabled={p.encounter || ['Assigned'].includes(p.team[id].state)} onClick={() => void action('SELECT', id)}><MonImage id={id}/><div><b>{titleCase(p.team[id].record?.name || String(id))}</b><small>{p.team[id].state === 'Reserve' ? 'Reserve' : p.team[id].state}</small></div></button>)}</div><div className="player-actions"><button aria-label="Help" onClick={()=>open('help')}>Help</button><button aria-label="Tasks" onClick={()=>open('journal')}>Tasks TAB</button><button aria-label="Objectives" onClick={() => open('objectives')}>Objectives M</button><button aria-label="Door controls" onClick={()=>open('doors')}>Routes</button><button aria-label="Tactical advice" onClick={() => open('advice')}>Plan</button><button onClick={() => setLight(v => !v)}>{light ? 'Flashlight on' : 'Flashlight off'}</button><button className="primary interact" aria-label="Interact" disabled={!targeted || s.paused || s.phase !== 'playing'} onClick={interact}>E · {targeted ? `${targeted.focus.value.name} · ${Math.round(distance(p.position,targeted.position)/25)} m` : 'Approach a terminal'}</button></div><ActionFeedback /><DangerAlert state={s} settings={presentation}/>{s.paused && <div className="pause-banner">SHARED MISSION PAUSED · active timer frozen</div>}{!net.connected && <div className="connection-banner">{s.connection} · authoritative input unavailable <button onClick={network.reconnect}>Reconnect</button></div>}{s.phase === 'countdown' && <div className="countdown-screen"><span>SHIFT BEGINS IN</span><strong>{s.countdown}</strong></div>}{['success', 'failed'].includes(s.phase) && <div className="result-screen"><span className="eyebrow">JOINT SHIFT OUTCOME</span><h1>{s.phase === 'success' ? 'Research secured. Both home.' : 'Regroup for the next shift.'}</h1><p>{s.broadcast}</p><div className="metric-grid"><div><strong>{fmt(s.elapsed)}</strong><small>{s.phase === 'success' ? 'Successful active time' : 'Incomplete elapsed time'}</small></div><div><strong>{s.trial}/{s.tasks.length}</strong><small>Assignments completed</small></div><div><strong>{s.director.interventions}</strong><small>Director interventions</small></div></div><details className="shift-debrief"><summary>Shift debrief / decisions and actual consequences</summary><p>{s.activity.keyUses} override keys used; {s.activity.doorChanges} door changes · {s.emergencies.filter(e=>e.status==='missed').length} emergency deadlines missed.</p>{s.tasks.filter(t=>t.option).map(t=><p key={t.id}>{t.name}: {taskChoices(t).find(c=>c.id===t.option)?.name} · {t.complete?'completed':'incomplete'}</p>)}{s.receipts?.slice(0,4).map(r=><p key={r.id}>{r.at}s · {r.title}: {r.changes.join(' ')}</p>)}<p>Actual outcomes above come from this shift. Forecasts were conditional estimates; the operator can compare forecast-versus-actual pairs in Analytics.</p></details><p>Trainer A: {s.players.A.exit ? 'extracted' : 'not extracted'} · Trainer B: {s.players.B.exit ? 'extracted' : 'not extracted'}</p><button onClick={() => navigate('/play')}>Return to entry</button><p>Ask the operator for a new shift code. Teams and incidents never carry into another room automatically.</p></div>}{overlay && !decision && <div className="modal-backdrop terminal-backdrop"><section className="modal equipment-terminal" tabIndex={-1} data-journal={overlay==='journal'} role="dialog" aria-label={typeof overlay === 'string' ? `${overlay} overlay` : `${overlay.kind} overlay`}><button className="close" aria-label="Close overlay" onClick={() => open(null)}>×</button>{typeof overlay==='object'&&overlay.kind==='task'&&emergencies[0]&&<div className="task-critical-notice" role="alert"><span>Critical: {emergencies[0].name}</span><strong>{Math.max(0,emergencies[0].expiresAt-s.elapsed)}s left / Respond now</strong></div>}{typeof overlay === 'object' ? (overlay.kind === 'task' ? taskPanel(overlay.value) : overlay.kind === 'emergency' ? emergencyPanel(overlay.value) : threatPanel(overlay.value)) : overlay === 'doors' ? <DoorControls state={s} role={role}/> : overlay === 'help' ? <FieldManual/> : overlay === 'briefing' ? <FieldBriefing state={s} role={role} onReady={()=>{}}/> : overlay === 'team' ? <><h2>Your companions</h2><p>One follows; two reserve. Engagement prevents switching. Assigned and battling companions stay busy.</p>{Object.keys(p.team).map(Number).map(id => <div className="team-row" key={id}><MonImage id={id}/><b>{titleCase(p.team[id].record?.name || String(id))}</b><span>{p.team[id].state}</span><button disabled={p.encounter || p.team[id].state === 'Assigned'} onClick={() => void action('SELECT', id)}>Switch</button></div>)}</> : overlay === 'journal' ? <TaskJournal state={s} role={role} items={journalItems} tracked={tracked} onTrack={setTracked}/> : overlay === 'objectives' ? <><h2>Research & response tracker</h2><PlayerMinimap state={s} role={role} yaw={yaw} settings={presentation} tracked={tracked} expanded/><button onClick={()=>open('journal')}>Open task journal</button><button onClick={()=>open('doors')}>Door locks and route controls</button><p>Follow physical room signs and the connected corridors. Markers show known assignments; threats are not revealed by this map.</p>{s.tasks.map(t => <div className="objective-row" key={t.id}><b>{t.complete ? '✓' : '◇'} {t.name}</b><span>{roomName(roomAtPosition(taskPosition(t)))} · {Math.round(pathLength(p.position,taskPosition(t),s)/25)} m via corridors · {t.role === 'both' ? 'Both trainers' : `Trainer ${t.role}`}</span></div>)}{emergencies.map(e => <p key={e.id}>! {e.name} · {roomName(roomAtPosition(e.position))}</p>)}<button onClick={() => open('signals')}>Send partner acknowledgment</button></> : overlay === 'settings' ? <><PresentationSettingsPanel value={presentation} onChange={value => { setPresentation(value); window.dispatchEvent(new CustomEvent('ghost-audio-unlock', { detail: value })); }}/><h3>Field controls</h3><button onClick={fullscreen}>Toggle fullscreen</button><p>WASD / arrows move relative to your view. Drag right mouse / touch to look around; click the world for mouse look. Trainer faces movement. E interacts; Q team; TAB task journal; M map; F flashlight; Escape closes menus.</p><p>Local overlays do not pause your partner or active timer.</p></> : overlay === 'advice' ? <FieldAnalyst state={s} role={role} inline/> : <><h2>Partner signals</h2>{['Acknowledged', 'Need help', 'Responding to emergency', 'Ready at stabilizer', 'Heading to extraction'].map(message => <button key={message} onClick={() => { void action('QUICK_SIGNAL', message); open(null); }}>{message}</button>)}</>}{typeof overlay==='object'&&<details className="context-analysis"><summary>Field Analyst / why, what next, best action</summary><FieldAnalyst state={s} role={role} inline/></details>}{error && <p className="error" role="alert">{error}</p>}</section></div>}{hint && <div className="hint" role="status">{hint}</div>}<div className="rotate-guard"><strong>Rotate to landscape</strong><p>The facility view needs a wider screen.</p><button onClick={() => navigate(`/play/lobby?role=${role}`)}>Return to briefing</button></div></div>;
}
import { roomAt as roomAtPosition } from './world';
