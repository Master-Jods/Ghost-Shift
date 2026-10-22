import {FieldManual,FieldBriefing,EntryIllustration} from './FieldManual';
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
const FirstPerson = lazy(()=>import('./FirstPerson')); 
import PlayerMinimap from './PlayerMinimap';
import { relativeLook } from './look';
import { ServerAdvice } from './NetworkUI';
import { copyText } from './clipboard';
import { objectives } from './objectives';
import {TaskTracker,TaskJournal} from './TaskUI';
import {journalTabIntent} from './gameInput';
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
    const s = useSyncExternalStore(transport.subscribe, transport.getSnapshot), net = useSyncExternalStore(transport.subscribe, network.getNetSnapshot), route = useRoute(), params = new URLSearchParams(location.search), role = (net.role === 'A' || net.role === 'B' ? net.role : params.get('role') === 'B' ? 'B' : 'A') as 'A' | 'B', other = role === 'A' ? 'B' : 'A', p = s.players[role];
    const [slot, setSlot] = useState<'A' | 'B'>(params.get('role') === 'B' ? 'B' : 'A'), [code, setCode] = useState(params.get('code') || ''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [team, setTeam] = useState<number[]>([]), [overlay, setOverlay] = useState<'team' | 'settings' | 'objectives' | 'journal' | 'help' | 'briefing' | 'advice' | 'signals' | Focus | null>(null), [yaw, setYaw] = useState(p.yaw), [light, setLight] = useState(true), [reduced, setReduced] = useState(localStorage.getItem('gs-reduced') === '1'), [locked, setLocked] = useState(false), [hint, setHint] = useState(''), [dial, setDial] = useState(0), [dials, setDials] = useState([0, 0, 0]);
    const teamDirty=team.length!==Object.keys(p.team).length||team.some(id=>!p.team[id]);
    const [pitch, setPitch] = useState(0);
    const [tracked,setTracked]=useState<string|null>(null);
    const journalItems=objectives(s,role),trackedObjective=journalItems.find(o=>o.id===tracked);
    useEffect(()=>{setTracked(null);},[s.id,role]);
    useEffect(()=>{if(!tracked||!journalItems.some(o=>o.id===tracked&&!o.complete))setTracked(s.tasks.find(t=>!t.complete&&(t.role===role||t.role==='both'))?.id||journalItems.find(o=>!o.complete)?.id||null);},[s.revision,tracked,role]);
    const lookState = useRef({yaw:p.yaw,pitch:0});
    const [presentation, setPresentation] = useState<PresentationSettings>(loadPresentation);
    const decision = useSyncExternalStore(transport.subscribe, network.getDecisionSnapshot);
    const keys = useRef(new Set<string>()), stick = useRef<Vec>({ x: 0, y: 0 }), stickBase = useRef<Vec | null>(null), lookTouch = useRef<Vec | null>(null), live = useRef({ s, overlay, yaw, role });
    live.current = { s, overlay, yaw, role };
    const isEntry = route === '/' || route.split('?')[0] === '/play', isLobby = route.includes('/lobby'), isGame = !isEntry && !isLobby;
    const ownTasks = s.tasks.filter(t => !t.complete && (t.role === 'both' || t.role === role)), emergencies = activeEmergencies(s), threats = activeThreats(s);
    const taskPosition=(t:Task)=>t.mode==='cooperative'&&role==='B'?t.secondPosition!:t.mode==='transfer'&&t.carrier?t.destination!:t.position;
    const candidates: ({
        focus: Focus;
        position: Vec;
    })[] = [...ownTasks.map(t => ({ focus: { kind: 'task' as const, value: t }, position: t.mode === 'cooperative' && role === 'B' ? t.secondPosition! : t.mode === 'transfer' && t.carrier ? t.destination! : t.position })), ...emergencies.filter(e => ['both', 'either', role].includes(e.scope)).map(e => ({ focus: { kind: 'emergency' as const, value: e }, position: e.kind === 'corruption' && e.carrier ? e.destination! : emergencyLocation(e, role) })), ...threats.map(t => ({ focus: { kind: 'threat' as const, value: t }, position: t.position }))];
    const targeted = candidates.filter(c => distance(c.position, p.position) < (c.focus.kind === 'threat' ? 140 : 85) && Math.abs(Math.atan2(Math.sin(Math.atan2(c.position.y - p.position.y, c.position.x - p.position.x) - yaw), Math.cos(Math.atan2(c.position.y - p.position.y, c.position.x - p.position.x) - yaw))) < 1.1 && lineOfSight(p.position, c.position, s)).sort((a, b) => { const da = distance(a.position, p.position), db = distance(b.position, p.position); if (Math.abs(da - db) < 40 && a.focus.kind !== b.focus.kind)
        return (a.focus.kind === 'emergency' ? -1 : a.focus.kind === 'task' ? 1 : 0) - (b.focus.kind === 'emergency' ? -1 : b.focus.kind === 'task' ? 1 : 0); return da - db; })[0];
    function open(value: typeof overlay) { keys.current.clear(); stick.current = { x: 0, y: 0 }; lookTouch.current=null; stickBase.current=null; if(s.phase==='playing'&&net.connected)transport.dispatch({ type: 'INPUT', value: { x: 0, y: 0 }, role }); if (document.pointerLockElement)
        document.exitPointerLock(); live.current.overlay=value; setOverlay(value); if(value!==null)requestAnimationFrame(()=>document.querySelector<HTMLElement>('.equipment-terminal[role="dialog"]')?.focus({preventScroll:true})); if (value === null)
        requestAnimationFrame(() => { const canvas = document.querySelector<HTMLCanvasElement>('.first-person'); if (canvas) {
            canvas.tabIndex = 0;
            canvas.focus({ preventScroll: true });
        } }); setDial(0); setDials([0, 0, 0]); }
    function interact() { if (!targeted) {
        setHint('Face a nearby research terminal or encounter.');
        return;
    } if (targeted.focus.kind === 'threat') {
        transport.dispatch({ type: 'ENCOUNTER', role, value: targeted.focus.value.instanceId });
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
        await network.join(slot, code.trim());
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
    useEffect(() => { setYaw(p.yaw); setPitch(0); lookState.current={yaw:p.yaw,pitch:0}; setTeam(Object.keys(p.team).map(Number)); }, [s.id, role]);
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
        keys.current.clear();
        stick.current = { x: 0, y: 0 };
        stickBase.current=null;lookTouch.current=null;
        if(document.pointerLockElement)document.exitPointerLock();
        transport.dispatch({type:'INPUT',role,value:{x:0,y:0}});
    } }, [!!decision]);
    useEffect(() => { if (!isGame)
        return; const down = (e: KeyboardEvent) => { const k = e.key.toLowerCase();
    const active=document.activeElement as HTMLElement|null,typing=!!(e.target as HTMLElement)?.closest('input,select,textarea,[contenteditable="true"]');
    if(k==='tab'){
      const view=live.current.overlay,intent=journalTabIntent({playing:live.current.s.phase==='playing',typing,modified:e.shiftKey||e.ctrlKey||e.altKey||e.metaKey,overlay:typeof view==='string'?view:view?'interaction':null,gameSurface:document.pointerLockElement?.matches('.first-person')===true||active?.matches('.first-person,body,html')===true,journalSurface:active?.matches('.equipment-terminal[data-journal="true"]')===true});
      if(intent&&!network.getDecisionSnapshot()){e.preventDefault();if(!e.repeat)inputActions.current.open(intent==='open'?'journal':null);}return;
    }
 if (k === 'escape') {
        inputActions.current.open(null);
        return;
    } if (typing) return; if (network.getDecisionSnapshot() || live.current.overlay)
        return; if (k === 'e' && !e.repeat) {
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
    } }; const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase()), blur = () => { const moving = keys.current.size > 0 || Math.hypot(stick.current.x, stick.current.y) > .01; keys.current.clear(); stick.current = { x: 0, y: 0 };stickBase.current=null;lookTouch.current=null; if (moving && network.getNetSnapshot().connected)
        transport.dispatch({ type: 'INPUT', role, value: { x: 0, y: 0 } }); }; const unlock = () => { if (!document.pointerLockElement)
        blur(); }, visibility = () => { if (document.hidden)
        blur(); }; document.addEventListener('pointerlockchange', unlock); document.addEventListener('visibilitychange', visibility); window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); const timer = setInterval(() => { const { s, overlay, yaw, role } = live.current; if (overlay || network.getDecisionSnapshot() || s.phase !== 'playing' || s.paused || !network.getNetSnapshot().connected)
        return; let forward = (keys.current.has('w') || keys.current.has('arrowup') ? 1 : 0) - (keys.current.has('s') || keys.current.has('arrowdown') ? 1 : 0) - stick.current.y, strafe = (keys.current.has('d') || keys.current.has('arrowright') ? 1 : 0) - (keys.current.has('a') || keys.current.has('arrowleft') ? 1 : 0) + stick.current.x; const length = Math.max(1, Math.hypot(forward, strafe)); forward /= length; strafe /= length; transport.dispatch({ type: 'LOOK', role, value: yaw }); transport.dispatch({ type: 'INPUT', role, value: { x: Math.cos(yaw) * forward - Math.sin(yaw) * strafe, y: Math.sin(yaw) * forward + Math.cos(yaw) * strafe } }); }, 80); return () => { clearInterval(timer); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('pointerlockchange', unlock); document.removeEventListener('visibilitychange', visibility); }; }, [isGame]);
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
    function taskPanel(t: Task) { const current = s.tasks.find(v => v.id === t.id)!; t=current; const submit = (answer: unknown) => void action('TASK_INPUT', { id: t.id, answer }); const choices=taskChoices(current);if(choices.length&&!current.option)return <section className="task-options"><span className="eyebrow">MAJOR TASK DECISION / TRAINER {t.role}</span><h2>{t.name}</h2><p>Choose how to restore this station. Inspect guaranteed costs and compare actual-rule forecasts before confirming.</p><div className="task-choice-grid">{choices.map(c=>{const check=taskChoiceCheck(s,current,role,c.id);return <article key={c.id}><h3>{c.name}</h3><b>{c.energy} shared energy · {c.stamina} companion stamina</b><ul>{c.effects.map(e=><li key={e}>{e}</li>)}</ul><button className="primary" disabled={!check.ok} onClick={()=>void network.requestPreview('TASK_OPTION',{id:t.id,option:c.id})}>Preview {c.name.toLowerCase()}</button>{!check.ok&&<p>{check.reason}</p>}</article>;})}</div></section>; if (current.complete)
        return <><h2>Assignment complete</h2><p>{t.name} is recorded in the research log.</p><div className="consequence-receipt">{s.receipts?.find(r=>r.changes.some(c=>c.includes(t.name)))?.changes.map(c=><p key={c}>{c}</p>)}</div><button onClick={() => open(null)}>Return to facility</button></>; return <><span className="eyebrow">RESEARCH ASSIGNMENT / {t.role === 'both' ? 'COOPERATIVE' : `TRAINER ${t.role}`}</span><h2>{t.name}</h2><p>{t.mode === 'cooperative' ? 'Activate your stabilizer. Your partner activates the other control within 12 active seconds.' : t.mode === 'transfer' ? current.carrier ? 'Research fragment secured. Bring it to Communications and upload there.' : 'Retrieve the research fragment here, then carry it to Communications.' : 'Use the terminal’s target values. Incorrect settings can be retried without a permanent penalty.'}</p><div className="target-code">TARGET {t.pattern.map(n => ['α', 'β', 'γ', 'δ'][n]).join(' · ')}</div>{t.mode === 'sequence' ? <><p>Step {current.progress + 1} / {t.pattern.length} · next channel {['α', 'β', 'γ', 'δ'][t.pattern[current.progress]]}</p><div className="task-buttons">{['α', 'β', 'γ', 'δ'].map((v, i) => <button key={v} onClick={() => submit(i)}>{v}</button>)}</div></> : t.mode === 'dial' ? <><label>Frequency {dial}<input aria-label="Signal frequency" type="range" min="0" max="3" value={dial} onChange={e => setDial(+e.target.value)}/></label><p>Required frequency: {t.pattern[0]} · {current.option==='standard'?'Standard: allow 8 active seconds to settle, then confirm.':'Boost: 15 stamina already spent; correct frequency completes immediately.'}</p>{current.calibrationUntil!==undefined&&<p className="calibration-clock">Signal settling: {Math.max(0,Math.ceil(current.calibrationUntil-s.worldTime))}s</p>}<button className="primary" disabled={current.calibrationUntil!==undefined&&s.worldTime<current.calibrationUntil} onClick={() => submit(dial)}>{current.calibrationUntil!==undefined?'Confirm stable signal':'Tune signal'}</button></> : t.mode === 'dials' ? <><div className="task-buttons">{dials.map((v, i) => <label key={i}>Gauge {i + 1} / target {t.pattern[i]}<input aria-label={`Gauge ${i + 1}`} type="number" min="0" max="3" value={v} onChange={e => setDials(old => old.map((x, n) => n === i ? +e.target.value : x))}/></label>)}</div><button className="primary" onClick={() => submit(dials)}>Apply calibration</button></> : ['code', 'choice'].includes(t.mode) ? <div className="task-buttons">{[0, 1, 2, 3].map(n => <button key={n} onClick={() => submit(n)}>{t.mode === 'choice' ? `${(n + 1) * 5}A fuse` : ['α', 'β', 'γ', 'δ'][n]}</button>)}<p>{t.mode === 'choice' ? `Required fuse: ${(t.pattern[0] + 1) * 5}A` : 'Enter the displayed access symbol.'}</p></div> : <button className="primary" onClick={() => submit(t.pattern)}>{t.mode === 'cooperative' ? 'Activate stabilizer' : current.carrier ? 'Upload research fragment' : 'Retrieve research fragment'}</button>}{t.mode === 'cooperative' && <p className="cooperative-status">A: {current.activated.A === undefined ? 'waiting' : 'activated'} · B: {current.activated.B === undefined ? 'waiting' : 'activated'}</p>}<button onClick={() => transport.dispatch({ type: 'ASSIST_TASK', role, value: t.id })}>Assign companion assistance</button></>; }
    function emergencyPanel(original: Emergency) { const e = s.emergencies.find(v => v.id === original.id)!; const def = EMERGENCIES.find(v => v.kind === e.kind)!; return <><span className="eyebrow">LIVE INCIDENT / {e.status.toUpperCase()}</span><h2>{e.name}</h2><p>{def.objective}</p><p>{Math.max(0, e.expiresAt - s.elapsed)} active seconds remaining · {e.scope} response · {e.blocking ? 'blocks extraction' : 'noncritical'}</p>{e.status === 'active' ? (e.kind === 'overload' && !e.allocated ? <div className="actions"><button onClick={() => transport.dispatch({ type: 'REQUEST', role, value: { eventId: e.id, plan: 'balanced' } })}>Propose balanced power · 2 energy</button><button onClick={() => transport.dispatch({ type: 'REQUEST', role, value: { eventId: e.id, plan: 'priority' } })}>Propose priority bypass · 1 energy</button></div> : e.scope === 'both' ? <><p>{e.kind==='overload'&&e.allocationPlan==='priority'?`Priority bypass round ${e.progress+1}/2. `:''}Separate controls: A {e.responses.A === undefined ? 'waiting' : 'active'} · B {e.responses.B === undefined ? 'waiting' : 'active'}</p><button className="primary" onClick={() => void action('RESPOND', { id: e.id })}>Activate my emergency control</button></> : e.kind === 'corruption' && !e.carrier ? <button onClick={() => void action('RESPOND', { id: e.id })}>Retrieve data fragment</button> : <><p>Reset {e.progress + 1} / {e.steps} · required channel {['α', 'β', 'γ', 'δ'][e.pattern[e.progress] ?? 0]}</p><div className="task-buttons">{[0, 1, 2, 3].map(n => <button key={n} onClick={() => void action('RESPOND', { id: e.id, answer: n })}>{['α', 'β', 'γ', 'δ'][n]}</button>)}</div></>) : <p>Incident {e.status}. Its environmental effects have been cleaned up.</p>}<small>Failure consequence: {def.failure}</small></>; }
    function threatPanel(original:Threat){const t=s.threats.find(v=>v.instanceId===original.instanceId);return t?<EncounterPanel state={s} role={role} threat={t} onAction={async command=>{window.dispatchEvent(new CustomEvent('ghost-intent'));await network.command('COMPANION',{id:t.instanceId,action:command});}} onRetreat={()=>{void action('LEAVE_ENCOUNTER');open(null);}}/>:<p>Encounter is no longer present.</p>;}
    const settingsDialog = ['settings','help','briefing'].includes(String(overlay)) && <div className="modal-backdrop terminal-backdrop"><section className="modal equipment-terminal utility-dialog" role="dialog" aria-label={`${overlay} overlay`}><button className="close" aria-label="Close overlay" onClick={()=>open(null)}>×</button>{overlay==='help'?<FieldManual/>:overlay==='briefing'?<FieldBriefing state={s} role={role} onReady={()=>{void network.command('ACK_BRIEFING',BRIEFING_VERSION).then(()=>open(null)).catch(e=>setError(e.message));}}/>:<PresentationSettingsPanel value={presentation} onChange={value=>{setPresentation(value);window.dispatchEvent(new CustomEvent('ghost-audio-unlock',{detail:value}));}}/>}{error&&<p role="alert" className="error">{error}</p>}</section></div>;
    function look(dx:number,dy:number,touch=false) { if (overlay || decision) return; const next=relativeLook(lookState.current,dx,dy,presentation,touch); lookState.current=next; setYaw(next.yaw); setPitch(next.pitch); }
    if (isEntry)
        return <div className="player-entry"><div className="entry-grid"/><header><a href="/play" className="wordmark">◉ POKÉMON <b>GHOST SHIFT</b></a><button aria-label="Settings" onClick={()=>open('settings')}>Player settings</button><a href="/operator">Operator control ↗</a></header><main><div><span className="eyebrow">ASTER RESEARCH FACILITY / NIGHT OPERATIONS</span><h1>POKÉMON<br /><em>GHOST SHIFT</em></h1><p>Clock in at Aster. Pick your companions.<br />Finish the work. Face the unknown. Get out together.</p><div className="entry-features"><span>01 · EXPLORE</span><span>02 · ADAPT</span><span>03 · EXTRACT</span></div><EntryIllustration/></div><section className="join-card"><span className="eyebrow">JOIN A LIVE SHIFT</span><div className="role-buttons">{(['A', 'B'] as const).map(r => <button className={slot === r ? 'selected' : ''} onClick={() => setSlot(r)} key={r}>TRAINER {r}</button>)}</div><label>Session code<input aria-label="Session code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="GS-XXXXXX" maxLength={16}/></label>{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy || !code} onClick={join}>{busy ? 'Connecting…' : 'JOIN SERVER SESSION'}</button>{net.authenticated && net.role !== 'control' && <button onClick={() => navigate(`/play/${s.phase === 'lobby' ? 'lobby' : `session/${s.id}`}?role=${role}`)}>Resume owned slot</button>}<small>Two real players · manual Live Director · maximum five active minutes</small></section></main><FieldManual/><footer>FIRST PERSON · WASD + MOUSE / TOUCH MOVE + LOOK <span>No impostors. No voting. One shared extraction.</span></footer>{settingsDialog}</div>;
    if (isLobby)
        return <div className="lobby-page"><header><a href="/play">← Player entry</a><span className="wordmark">POKÉMON <b>GHOST SHIFT</b></span><button aria-label="Settings" onClick={()=>open('settings')}>Settings</button><button onClick={fullscreen}>Fullscreen</button><button onClick={()=>open('help')}>How to play</button></header><main><span className="eyebrow">BRIEFING IS OUTSIDE ACTIVE MISSION TIME</span><h1>Assemble your night crew.</h1><p>Choose three companions. Every species can help. Finalize your team, then review the required field briefing before the operator starts.</p><div className="lobby-strip"><b>ROOM {s.code}</b><span>Trainer {role}: {p.teamFinalized&&teamDirty?'UNSAVED TEAM CHANGES':p.teamFinalized ? 'TEAM FINALIZED' : 'SELECT THREE'}</span><span>Partner: {s.players[other].ready ? 'READY' : net.presence[other].connected ? 'CHOOSING TEAM' : 'NOT CONNECTED'}</span><span>Deadline {fmt(s.config.duration)}</span></div><PokemonPicker selected={team} onChange={setTeam}/>{error && <p className="error" role="alert">{error}</p>}<div className="sticky-ready"><button className="primary" disabled={team.length !== 3 || busy || s.phase !== 'lobby'} onClick={async () => { setBusy(true); try {
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
    return <div className={`player-game ${presentation.reducedMotion ? 'motion-reduced' : ''}`} style={{'--hud-scale':presentation.hudScale,'--minimap-size':presentation.minimapSize+'px'} as React.CSSProperties}><Suspense fallback={<div className="world-loading">INITIALIZING FIELD EQUIPMENT</div>}><FirstPerson state={s} role={role} yaw={yaw} pitch={pitch} inputEnabled={!overlay&&!decision} flashlight={light} reduced={reduced} settings={presentation} tracked={trackedObjective&&!trackedObjective.complete?{id:trackedObjective.id,position:trackedObjective.position}:undefined} focus={targeted ? { id: targeted.focus.kind === 'threat' ? targeted.focus.value.instanceId : targeted.focus.value.id, position: targeted.position, label: targeted.focus.value.name, kind: targeted.focus.kind } : undefined} onLook={(dx,dy) => look(dx,dy)} onLock={setLocked}/></Suspense><div className="look-zone" aria-label="Touch look area" onPointerDown={e => { if(overlay||decision)return; lookTouch.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!lookTouch.current)
        return; look(e.clientX-lookTouch.current.x,e.clientY-lookTouch.current.y,true); lookTouch.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={() => lookTouch.current = null} onPointerCancel={() => lookTouch.current = null}/><header className="player-top"><span className="wordmark">◉ <b>GHOST SHIFT</b><small>TRAINER {role} · {roomName(p.room)}</small></span><div><button onClick={() => { const canvas = document.querySelector<HTMLCanvasElement>('.first-person'); if (document.pointerLockElement)
        document.exitPointerLock();
    else
        void canvas?.requestPointerLock(); }}>{locked ? 'Release mouse' : 'Mouse look'}</button><button onClick={fullscreen}>Fullscreen</button><button aria-label="Settings" onClick={() => open('settings')}>⚙</button></div></header><div key={p.room} className="room-entry-label">{roomName(p.room)}</div><div className="hud-right-column"><PlayerMinimap state={s} role={role} yaw={yaw} settings={presentation} tracked={tracked} onExpand={()=>open('objectives')}/><FieldAnalyst state={s} role={role} hidden={!!overlay||!!decision}/></div><TaskTracker state={s} items={journalItems} tracked={tracked} onTrack={setTracked} onJournal={()=>open('journal')}/><CollisionDebug state={s} role={role}/>{!overlay&&!decision&&<ConsequenceToast state={s}/>}<div className="mission-hud"><div><span className="eyebrow">RESEARCH ASSIGNMENTS</span><strong>{s.tasks.filter(t => t.complete).length} / {s.tasks.length}</strong><small>{extractionReady(s) ? 'EXTRACTION OPEN · BOTH TRAINERS REQUIRED' : nearest ? `${nearest.name} · ${roomName(roomAtPosition(taskPosition(nearest)))}` : 'Respond to extraction-blocking incidents'}</small></div><div className="deadline"><span>ACTIVE TIME REMAINING</span><strong>{fmt(Math.max(0, s.config.duration - s.elapsed))}</strong><small>{s.energy} energy · {s.items} shared items</small></div></div><div className="partner-chip">{other} · {net.presence[other].connected ? 'CONNECTED' : 'DISCONNECTED'} · {s.players[other].exit ? 'EXTRACTED' : s.players[other].signalUntil > s.worldTime ? s.players[other].signal : 'COOPERATIVE PARTNER'}</div>{showAlert && <div className="incident-alert" role="status"><strong>{alert ? `DANGER — ${titleCase(alert.name).toUpperCase()} DETECTED` : `ALERT — ${emergencies[0].name}`}</strong><span>{alert ? `LOCATION: ${roomName(roomAtPosition(alert.position))} · OBJECTIVE: Guard, scout and contain.` : `LOCATION: ${roomName(roomAtPosition(emergencies[0].position))} / ${EMERGENCIES.find(e => e.kind === emergencies[0].kind)?.objective} / ${emergencies[0].scope.toUpperCase()} / ${Math.max(0, emergencies[0].expiresAt - s.elapsed)}s`}</span></div>}<aside className="emergency-tracker">{threats.map(t => <button className="threat-tracker" key={t.instanceId} onClick={() => { if (distance(p.position, t.position) < 140 && lineOfSight(p.position, t.position, s) && !p.encounter)
        transport.dispatch({ type: 'ENCOUNTER', role, value: t.instanceId }); open({ kind: 'threat', value: t }); }}>◇ {titleCase(t.name)}<small>{roomName(roomAtPosition(t.position))} / {s.worldTime < t.activeAt ? 'materializing' : t.revealed ? 'identified' : 'unverified'}</small></button>)}{emergencies.map(e => <button key={e.id} onClick={() => open({ kind: 'emergency', value: e })}>{e.blocking ? '!' : '•'} {e.name} <small>{roomName(roomAtPosition(e.position))} / {fmt(Math.max(0, e.expiresAt - s.elapsed))} / {e.scope}</small></button>)}</aside><div className="joystick" role="application" aria-label="Touch movement joystick" onPointerDown={e => { stickBase.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!stickBase.current)
        return; const dx = (e.clientX - stickBase.current.x) / 45, dy = (e.clientY - stickBase.current.y) / 45, n = Math.max(1, Math.hypot(dx, dy)); stick.current = { x: dx / n, y: dy / n }; }} onPointerUp={() => { stick.current = { x: 0, y: 0 }; stickBase.current = null; }} onPointerCancel={() => { stick.current = { x: 0, y: 0 }; stickBase.current = null; }}><span>W</span><b>＋</b><small>A · S · D</small></div><div className="companion-hud">{Object.keys(p.team).map(Number).map(id => <button key={id} className={p.selected === id ? 'selected' : ''} disabled={p.encounter || ['Assigned', 'Recovering', 'Exhausted'].includes(p.team[id].state)} onClick={() => void action('SELECT', id)}><MonImage id={id}/><div><b>{titleCase(p.team[id].record?.name || String(id))}</b><small>{p.team[id].state === 'Unavailable' ? 'Reserve' : p.team[id].state} · {p.team[id].stamina.toFixed(0)}%</small></div></button>)}</div><div className="player-actions"><button aria-label="Help" onClick={()=>open('help')}>Help</button><button aria-label="Tasks" onClick={()=>open('journal')}>Tasks TAB</button><button aria-label="Objectives" onClick={() => open('objectives')}>Objectives M</button><button aria-label="Tactical advice" onClick={() => open('advice')}>Plan</button><button onClick={() => setLight(v => !v)}>{light ? 'Flashlight on' : 'Flashlight off'}</button><button className="primary interact" aria-label="Interact" disabled={!targeted || s.paused || s.phase !== 'playing'} onClick={interact}>E · {targeted ? `${targeted.focus.value.name} · ${Math.round(distance(p.position,targeted.position)/25)} m` : 'Face a terminal'}</button></div>{!locked && !overlay && <div className="look-hint">Mouse look: click the world or “Mouse look” · Touch: drag the right side · F flashlight</div>}<ActionFeedback />{s.paused && <div className="pause-banner">SHARED MISSION PAUSED · active timer frozen</div>}{!net.connected && <div className="connection-banner">{s.connection} · authoritative input unavailable <button onClick={network.reconnect}>Reconnect</button></div>}{s.phase === 'countdown' && <div className="countdown-screen"><span>SHIFT BEGINS IN</span><strong>{s.countdown}</strong></div>}{['success', 'failed'].includes(s.phase) && <div className="result-screen"><span className="eyebrow">JOINT SHIFT OUTCOME</span><h1>{s.phase === 'success' ? 'Research secured. Both home.' : 'Regroup for the next shift.'}</h1><p>{s.broadcast}</p><div className="metric-grid"><div><strong>{fmt(s.elapsed)}</strong><small>{s.phase === 'success' ? 'Successful active time' : 'Incomplete elapsed time'}</small></div><div><strong>{s.trial}/{s.tasks.length}</strong><small>Assignments completed</small></div><div><strong>{s.director.interventions}</strong><small>Director interventions</small></div></div><details className="shift-debrief"><summary>Shift debrief / decisions and actual consequences</summary><p>{s.consumption.energy} shared energy spent · {s.consumption.items} recovery items used · {s.emergencies.filter(e=>e.status==='missed').length} emergency deadlines missed.</p>{s.tasks.filter(t=>t.option).map(t=><p key={t.id}>{t.name}: {taskChoices(t).find(c=>c.id===t.option)?.name} · {t.complete?'completed':'incomplete'}</p>)}{s.receipts?.slice(0,4).map(r=><p key={r.id}>{r.at}s · {r.title}: {r.changes.join(' ')}</p>)}<p>Actual outcomes above come from this shift. Forecasts were conditional estimates; the operator can compare forecast-versus-actual pairs in Analytics.</p></details><p>Trainer A: {s.players.A.exit ? 'extracted' : 'not extracted'} · Trainer B: {s.players.B.exit ? 'extracted' : 'not extracted'}</p><button onClick={() => navigate('/play')}>Return to entry</button><p>Ask the operator for a new shift code. Teams and incidents never carry into another room automatically.</p></div>}{overlay && !decision && <div className="modal-backdrop terminal-backdrop"><section className="modal equipment-terminal" tabIndex={-1} data-journal={overlay==='journal'} role="dialog" aria-label={typeof overlay === 'string' ? `${overlay} overlay` : `${overlay.kind} overlay`}><button className="close" aria-label="Close overlay" onClick={() => open(null)}>×</button>{typeof overlay === 'object' ? (overlay.kind === 'task' ? taskPanel(overlay.value) : overlay.kind === 'emergency' ? emergencyPanel(overlay.value) : threatPanel(overlay.value)) : overlay === 'help' ? <FieldManual/> : overlay === 'briefing' ? <FieldBriefing state={s} role={role} onReady={()=>{}}/> : overlay === 'team' ? <><h2>Your companions</h2><p>One follows; two reserve. Engagement prevents switching. Assigned/recovering companions stay unavailable.</p>{Object.keys(p.team).map(Number).map(id => <div className="team-row" key={id}><MonImage id={id}/><b>{titleCase(p.team[id].record?.name || String(id))}</b><span>{p.team[id].state} · {p.team[id].stamina.toFixed(0)}%</span><button disabled={p.encounter || p.team[id].state === 'Assigned'} onClick={() => void action('SELECT', id)}>Switch</button></div>)}<button onClick={() => transport.dispatch({ type: 'ITEM', role })}>Use shared recovery item ({s.items})</button><button onClick={() => void action('RECOVER')}>Recover at Medical Bay</button></> : overlay === 'journal' ? <TaskJournal items={journalItems} tracked={tracked} onTrack={setTracked}/> : overlay === 'objectives' ? <><h2>Research & response tracker</h2><PlayerMinimap state={s} role={role} yaw={yaw} settings={presentation} tracked={tracked} expanded/><button onClick={()=>open('journal')}>Open task journal</button><p>Follow physical room signs and the connected corridors. Markers show known assignments; threats are not revealed by this map.</p>{s.tasks.map(t => <div className="objective-row" key={t.id}><b>{t.complete ? '✓' : '◇'} {t.name}</b><span>{roomName(roomAtPosition(taskPosition(t)))} · {Math.round(pathLength(p.position,taskPosition(t),s)/25)} m via corridors · {t.role === 'both' ? 'Both trainers' : `Trainer ${t.role}`}</span></div>)}{emergencies.map(e => <p key={e.id}>! {e.name} · {roomName(roomAtPosition(e.position))}</p>)}<button onClick={() => open('signals')}>Send partner acknowledgment</button></> : overlay === 'settings' ? <><PresentationSettingsPanel value={presentation} onChange={value => { setPresentation(value); window.dispatchEvent(new CustomEvent('ghost-audio-unlock', { detail: value })); }}/><h3>Field controls</h3><button onClick={fullscreen}>Toggle fullscreen</button><p>WASD / arrows move relative to the camera. Mouse-look or right-side touch-look turns. E interacts; Q team; TAB task journal; M map; F flashlight; Escape releases menus/pointer lock.</p><p>Local overlays do not pause your partner or active timer.</p></> : overlay === 'advice' ? <FieldAnalyst state={s} role={role} inline/> : <><h2>Partner signals</h2>{['Acknowledged', 'Need help', 'Responding to emergency', 'Ready at stabilizer', 'Heading to extraction'].map(message => <button key={message} onClick={() => { void action('QUICK_SIGNAL', message); open(null); }}>{message}</button>)}</>}{typeof overlay==='object'&&<details className="context-analysis"><summary>Field Analyst / why, what next, best action</summary><FieldAnalyst state={s} role={role} inline/></details>}{error && <p className="error" role="alert">{error}</p>}</section></div>}{hint && <div className="hint" role="status">{hint}</div>}<div className="rotate-guard"><strong>Rotate to landscape</strong><p>Your first-person terminal needs a wider view.</p><button onClick={() => navigate(`/play/lobby?role=${role}`)}>Return to briefing</button></div></div>;
}
import { roomAt as roomAtPosition } from './world';
