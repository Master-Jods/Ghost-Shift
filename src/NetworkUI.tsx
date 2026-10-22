import { useState, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { network, transport } from './transport';
import { fmt } from './data';
import { navigate } from './router';
import GhostMap from './GhostMap';
import {RULES} from './rules';
export async function runJob(kind: string, options: Record<string, unknown> = {}, progress?: (status: string, id: string) => void) { const id = network.getNetSnapshot().sessionId; if (!id)
    throw Error('Select a session.'); const response = await network.api(`/api/sessions/${id}/jobs`, { method: 'POST', body: JSON.stringify({ kind, ...options }) }); while (true) {
    const job = await network.api('/api/jobs/' + response.jobId);
    progress?.(job.status, job.id);
    if (job.status === 'complete')
        return { ...job.result, context: job.context, jobId: job.id };
    if (['failed', 'cancelled'].includes(job.status))
        throw Error(job.error || 'Job cancelled.');
    await new Promise(r => setTimeout(r, 500));
} }
export function OperatorGate({ children }: {
    children: ReactNode;
}) {
    const [operator, setOperator] = useState<any>(null), [checking, setChecking] = useState(true), [username, setUsername] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [sessions, setSessions] = useState<any[]>([]), [attached, setAttached] = useState(false), [busy, setBusy] = useState(false);
    async function refresh() { const data = await network.api('/api/sessions'); setSessions(data.sessions); return data.sessions; }
    async function attach(id: string) { setBusy(true); try {
        await network.operatorConnect(id);
        setAttached(true);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    useEffect(() => { network.api('/api/operator/me').then(async (r) => { setOperator(r.operator); const list = await refresh(), id = sessionStorage.getItem('jt-operator-session'), found = list.find((s: any) => s.id === id && !s.closed && s.state?.schema === 3) || list.find((s: any) => !s.closed && s.state?.schema === 3); if (found)
        await attach(found.id); }).catch(() => { }).finally(() => setChecking(false)); }, []);
    useEffect(() => { if (!operator)
        return; const timer = setInterval(() => void refresh().catch(() => { }), 7000); return () => clearInterval(timer); }, [operator]);
    async function login(e: React.FormEvent) { e.preventDefault(); setBusy(true); try {
        const r = await network.api('/api/operator/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        setOperator(r.operator);
        setPassword('');
        const list = await refresh(), found = list.find((s: any) => !s.closed && s.state?.schema === 3);
        if (found)
            await attach(found.id);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function create() { setBusy(true); try {
        await network.createSession();
        setAttached(true);
        await refresh();
        navigate('/operator');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    if (checking)
        return <div className="auth-shell"><h1>GHOST SHIFT</h1><p>Connecting to facility control…</p></div>;
    if (!operator)
        return <div className="auth-shell"><div className="auth-card"><span className="eyebrow">ASTER FACILITY / OPERATOR AUTHORITY</span><h1>POKÉMON<br /><em>GHOST SHIFT</em></h1><p>Two trainers in the field. One live research director.</p><form onSubmit={login}><label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p role="alert" className="error">{error}</p>}<button className="primary" disabled={busy || !username || !password}>Sign in</button></form><a href="/play">Player entry →</a><details><summary>Host setup</summary>Create an account with npm run operator:create using the private .env. Existing accounts remain valid.</details></div></div>;
    return <><header className="server-toolbar"><span>◈ {operator.username} · AUTHENTICATED OPERATOR</span><label>Session<select aria-label="Server session" value={network.getNetSnapshot().sessionId || ''} onChange={e => void attach(e.target.value)}><option value="" disabled>Select room</option>{sessions.map(s => <option key={s.id} value={s.id} disabled={s.closed || s.state?.schema !== 3}>{s.code} · {s.state?.scenarioVersion === RULES.scenario.version ? s.state.phase : 'archived map version'}</option>)}</select></label><button onClick={create} disabled={busy}>Create session</button><button onClick={async () => { await network.api('/api/operator/logout', { method: 'POST', body: '{}' }); network.destroy(); location.assign('/operator'); }}>Sign out</button></header>{error && <div className="global-error" role="alert">{error}</div>}{attached ? children : <div className="auth-shell"><h1>Open the next shift.</h1><p>Start threat-free. Share the room code with two trainers.</p><button className="primary" onClick={create} disabled={busy}>Create the first session</button></div>}</>;
}
export function DecisionLayer() { const view = useSyncExternalStore(transport.subscribe, network.getDecisionSnapshot), state = useSyncExternalStore(transport.subscribe, transport.getSnapshot), [now, setNow] = useState(Date.now()); useEffect(() => { if (!view)
    return; const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, [!!view]); if (!view)
    return null; const p = view.preview, proposal = view.proposal, partner = proposal && proposal.by !== network.getNetSnapshot().role, expired = now >= (proposal?.expiresAt || p?.expiresAt || Infinity); return <div className="modal-backdrop decision-backdrop"><section className="modal decision" role="dialog" aria-modal="true" aria-label="Authoritative decision preview"><button className="close" onClick={network.cancelDecision} aria-label="Close decision preview">×</button>{view.loading ? <><span className="eyebrow">ASTER / EQUIPMENT ADVISER</span><h2>Inspecting this action</h2><p>Comparing legal continuations. Mission time continues; your partner can keep moving.</p><div className="adviser-loading" aria-label="Analysis in progress"><i /><i /><i /></div><button onClick={network.cancelDecision}>Cancel inspection</button></> : !p ? <><span className="eyebrow">EQUIPMENT LINK</span><h2>Inspection unavailable</h2><p role="alert">{view.error}</p><button onClick={network.cancelDecision}>Return</button></> : <><span className="eyebrow">{p.area} / EQUIPMENT ADVISER</span><h2>{partner ? 'Partner proposal: ' : ''}{p.title}</h2><div className="chips"><span>{p.costs.energy} ENERGY</span><span>{p.costs.items} ITEMS</span>{!!p.costs.stamina&&<span>{p.costs.stamina} STAMINA</span>}<span>{Math.max(0, Math.ceil(((proposal?.expiresAt || p.expiresAt) - now) / 1000))}s REVIEW</span></div><p className={p.feasible ? 'good' : 'error'}>{p.reason}</p><h3>KNOWN EFFECT / AUTHORITATIVE RULES</h3><ul>{p.knownEffects.map(effect => <li key={effect}>{effect}</li>)}</ul><p className="partner-impact">Partner impact: {p.action.type === 'REQUEST' ? 'Your partner must approve. Shared power is spent only after validation.' : p.action.type === 'INJECT' ? 'The affected trainers receive a live response objective; the active clock continues.' : 'Your partner remains free to move. Shared resource changes affect both trainers.'}</p>{p.placement && <div className="placement-mini"><GhostMap state={state} placement={p.placement}/></div>}<h3>PREDICTED OUTCOME / MONTE CARLO</h3><div className="metric-grid"><div><strong>{Math.round(p.forecast.probability * 100)}%</strong><small>{p.forecast.successes}/{p.forecast.n} sampled extractions</small></div><div><strong>{p.forecast.remaining === null ? '—' : fmt(p.forecast.remaining)}</strong><small>Successful remaining mean</small></div><div><strong>{p.forecast.incomplete}</strong><small>Incomplete samples</small></div></div>{p.taskOptions&&<section className="compared-options"><h3>ALTERNATIVES / ACTUAL TASK CHOICES</h3>{p.taskOptions.map(o=><article key={o.id}><b>{o.name}</b><p>{o.energy} energy · {o.stamina} stamina · {o.forecast.successes}/{o.forecast.n} sampled extractions · {o.forecast.remaining??"unavailable"}s successful mean.</p><p>{o.feasible?o.effects.join(" "):o.reason}</p></article>)}</section>}<div className="decision-summary"><span>{p.recommendation.label.toUpperCase()} / COMPARED POLICIES</span><b>{p.recommendation.plan}</b></div><details><summary>Full effects, alternatives & model assumptions</summary>{[].map(effect => <p key={effect}>{effect}</p>)}<p>{p.recommendation.reason}</p>{p.alternatives.map(option => <p key={option.name}>{option.name}: {option.forecast.successes}/{option.forecast.n} extracted; {option.forecast.remaining ?? 'unavailable'}s successful mean.</p>)}{p.assumptions.map(assumption => <p key={assumption}>{assumption}</p>)}<small>{p.forecast.method} / {p.forecast.version}</small></details><p className="forecast-caption">No further director injections assumed. Estimates are not guarantees.</p>{view.error && <p className="error" role="alert">{view.error}</p>}<div className="actions">{proposal ? <><button className="primary" disabled={expired || !partner || proposal.status !== 'pending'} onClick={network.confirmDecision}>Approve this proposal</button>{partner ? <button onClick={network.rejectProposal}>Reject</button> : <button onClick={network.cancelProposal}>Cancel proposal</button>}</> : <><button className="primary" disabled={expired || !p.feasible} onClick={network.confirmDecision}>{p.action.type === 'REQUEST' ? 'Request partner approval' : 'Confirm after revalidation'}</button><button onClick={() => void network.requestPreview(p.action.type, p.action.value)}>Refresh preview</button></>}<button onClick={network.cancelDecision}>Cancel / return</button></div></>}</section></div>; }
export function NetworkFeedback() { const net = useSyncExternalStore(transport.subscribe, network.getNetSnapshot); const decision = useSyncExternalStore(transport.subscribe, network.getDecisionSnapshot); return <>{net.error && !decision && <div className="network-toast" role="status">{net.error}<button aria-label="Dismiss network message" onClick={network.clearError}>×</button></div>}{net.closed && <div className="global-error">Session closed. {net.rematchCode ? <a href={`/play?role=${net.role === 'B' ? 'B' : 'A'}&code=${net.rematchCode}`}>Join next room {net.rematchCode}</a> : 'Ask the operator for the next room.'}</div>}{net.proposal?.status === 'pending' && net.role !== 'control' && <button className="proposal-button" onClick={network.reviewProposal}>Review shared power proposal</button>}</>; }
export function ServerAdvice() { const [data, setData] = useState<any>(null), [error, setError] = useState(''); useEffect(() => { runJob('plans', { n: 4 }).then(setData).catch(e => setError(e.message)); }, []); return <><h2>Response planner</h2><p>Compared responder, route priority and containment/battle continuations. No future operator events are assumed.</p>{error && <p className="error">{error}</p>}{data ? <><h3>{data.label}: {data.best?.name || 'No feasible continuation'}</h3>{data.plans.map((p: any) => <p key={p.name}>{p.name} · {p.forecast.successes}/{p.forecast.n} extracted · {p.forecast.remaining ?? 'unavailable'}s successful mean</p>)}<div className="actions"><button onClick={() => transport.dispatch({ type: 'ACCEPT', value: { jobId: data.jobId, plan: data.best?.name, stateVersion: data.context?.stateVersion } })}>Accept response plan</button><button onClick={() => transport.dispatch({ type: 'OVERRIDE', value: { jobId: data.jobId } })}>Override</button></div></> : !error && <p>Computing bounded continuations…</p>}</>; }
export function LiveForecast() { return <p>Open Predictive analytics to compute a conditional Monte Carlo forecast of the current shift.</p>; }
