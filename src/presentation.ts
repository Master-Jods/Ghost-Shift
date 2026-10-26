import type { State } from './engine';
import type { Vec } from './world';
export type PresentationSettings = {
    cameraDistance: number;
    quality: 'low' | 'standard' | 'high';
    sensitivity: number;
    touchSensitivity: number;
    invertY: boolean;
    smoothing: boolean;
    fov: number;
    headBob: number;
    cameraShake: number;
    renderScale: number;
    shadows: boolean;
    brightness: number;
    showFps: boolean;
    minimapSize: number;
    minimapOrientation: 'north' | 'heading';
    hudScale: number;
    reducedMotion: boolean;
    reducedFlashes: boolean;
    postProcessing: boolean;
    muted: boolean;
    master: number;
    effects: number;
    ambience: number;
    music:number;
    audioVersion:number;
    battleVolume:number;
};
export const defaultPresentation: PresentationSettings = {
    cameraDistance:94, quality: 'standard', sensitivity: .003, touchSensitivity: .006, invertY: false, smoothing: false,
    fov: 78, headBob: 0, cameraShake: 0, renderScale: 1, shadows: true, brightness: 1,
    showFps: false, minimapSize: 440, minimapOrientation: 'north', hudScale: 1,
    reducedMotion: false, reducedFlashes: true, postProcessing: true, muted: false, audioVersion:3, battleVolume:.7, music:.85, master: .65, effects: .95, ambience: .22
};
export function sanitizePresentation(saved: Partial<PresentationSettings>): PresentationSettings {
    const value = { ...defaultPresentation };
    for (const key of Object.keys(value) as (keyof PresentationSettings)[]) {
        if (typeof saved[key] === typeof value[key])
            (value as unknown as Record<string, unknown>)[key] = saved[key];
    }
    const ranges: Partial<Record<keyof PresentationSettings, [
        number,
        number
    ]>> = {
        cameraDistance:[56,140], sensitivity: [.0001, .008], touchSensitivity: [.001, .015], fov: [60, 100], headBob: [0, 1], cameraShake: [0, 1],
        renderScale: [.5, 1.5], brightness: [.6, 1.6], minimapSize: [180, 600], hudScale: [.8, 1.3], master: [0, 1], effects: [0, 1], ambience: [0, 1], music:[0,1],battleVolume:[0,1]
    };
    for (const [key, bounds] of Object.entries(ranges)) {
        const k = key as keyof PresentationSettings, n = Number(value[k]);
        (value as unknown as Record<string, unknown>)[k] = Number.isFinite(n) ? Math.max(bounds[0], Math.min(bounds[1], n)) : defaultPresentation[k];
    }
    if (!['low', 'standard', 'high'].includes(value.quality))
        value.quality = 'standard';
    if (!['north', 'heading'].includes(value.minimapOrientation))
        value.minimapOrientation = 'north';
    return value;
}
export function loadPresentation(): PresentationSettings {
    try {
        const saved = JSON.parse(localStorage.getItem('gs-presentation') || '{}');if(saved._uiVersion!==2&&(!saved.minimapSize||saved.minimapSize===220))saved.minimapSize=440;
        if(saved.audioVersion!==3){const legacy=saved.audioVersion===undefined;if(legacy)saved.muted=false;saved.master=Math.max(saved.master||0,.85);saved.music=Math.max(saved.music||0,.85);saved.effects=Math.max(saved.effects||0,.95);saved.ambience=saved.ambience??.3;saved.audioVersion=3;}return sanitizePresentation({ reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, ...saved });
    }
    catch {
        return { ...defaultPresentation };
    }
}
export function savePresentation(value: PresentationSettings) {
    try {
        localStorage.setItem('gs-presentation', JSON.stringify({...value,_uiVersion:2}));
    }
    catch { /* Session settings still work in private storage contexts. */ }
}
export type CueKind = 'step' | 'door' | 'switch' | 'task-success' | 'task-error' | 'materialize' | 'emergency' | 'attack' | 'impact' | 'guard' | 'support' | 'contain' | 'resolved' | 'selection' | 'radio' | 'extraction' | 'submitted';
export type VisualCue = {
    id: string;
    kind: CueKind;
    at: number;
    duration: number;
    position: Vec;
    label: string;
    amount?: number;
};
export const cueDuration: Record<CueKind, number> = { step: 170, door: 650, switch: 450, 'task-success': 1200, 'task-error': 600, materialize: 3000, emergency: 1600, attack: 480, impact: 600, guard: 900, support: 1100, contain: 1000, resolved: 1600, selection: 500, radio: 700, extraction: 1800, submitted: 200 };
export const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const cueProgress = (cue: VisualCue, now: number) => Math.max(0, Math.min(1, (now - cue.at) / cue.duration));
/** Observes authoritative snapshots. It never changes a game state or predicts success. */
export class PresentationTimeline {
    cues: VisualCue[] = [];
    private previous: State | null = null;
    private seen = new Set<string>();
    private serial = 0;
    reset() { this.previous = null; this.seen.clear(); this.cues = []; }
    push(kind: CueKind, position: Vec, label: string, now: number, amount?: number) { const cue = { id: 'fx-' + ++this.serial, kind, position: { ...position }, label, at: now, duration: cueDuration[kind], amount }; this.cues.push(cue); this.cues = this.cues.slice(-40); return cue; }
    observe(s: State, role: 'A' | 'B', now: number) {
        const before = this.previous;
        this.previous = s;
        if (!before || before.id !== s.id) {
            this.seen = new Set(s.events.map(e => e.id));
            this.cues = [];
            return [];
        }
        if (before.revision === s.revision)
            return [];
        const added: VisualCue[] = [];
        const add = (kind: CueKind, position: Vec, label: string, amount?: number) => added.push(this.push(kind, position, label, now, amount));
        if (before.players[role].selected !== s.players[role].selected)
            add('selection', s.players[role].position, 'Companion deployed');
        for (const t of s.threats) {
            const old = before.threats.find(v => v.instanceId === t.instanceId);
            if (!old && t.status === 'active')
                add('materialize', t.position, `${t.name.toUpperCase()} DETECTED`);
            else if (old && old.status === 'active' && t.status !== 'active')
                add('resolved', t.position, `${t.name} ${t.status}`);
            if (old && t.supportUntil > old.supportUntil)
                add('support', t.position, 'Support prepared');
            if (old && t.hp < old.hp)
                add('impact', t.position, 'Impact confirmed', old.hp - t.hp);
            if (old && t.containment > old.containment)
                add('contain', t.position, 'Containment confirmed', t.containment - old.containment);
        }
        for (const e of s.emergencies) {
            const old = before.emergencies.find(v => v.id === e.id);
            if (!old && e.status === 'active')
                add('emergency', e.position, e.name);
            else if (old?.status === 'active' && e.status !== 'active')
                add(e.status === 'resolved' ? 'task-success' : 'switch', e.position, `${e.name} ${e.status}`);
            else if (old && e.progress > old.progress)
                add('switch', e.position, 'Circuit accepted');
        }
        for (const t of s.tasks) {
            const old = before.tasks.find(v => v.id === t.id);
            if (old && !old.complete && t.complete)
                add('task-success', t.position, 'Research objective complete');
            else if (old && old.progress < t.progress)
                add('switch', t.position, 'Terminal input accepted');
        }
        for (const event of [...s.events].reverse()) {
            if (this.seen.has(event.id))
                continue;
            this.seen.add(event.id);
            const incident = s.threats.find(t => t.instanceId === event.data?.incidentId), task = s.tasks.find(t => t.id === event.data?.taskId), position = incident?.position || task?.position || s.players[role].position;
            if (event.data?.rejected && task && task.role !== 'both' && task.role !== role)
                continue;
            if (event.data?.rejected)
                add('task-error', position, 'Calibration mismatch — retry');
            else if (event.kind === role && event.text.includes('guarded'))
                add('guard', position, 'Guard ready / one counter');
            else if (event.kind === role && event.text.includes(': attack'))
                add('attack', position, 'Attack confirmed');
            else if (event.kind === role && event.text.includes('scouted'))
                add('switch', position, 'Signature identified');
            else if (event.kind !== 'encounter' && event.kind !== role && event.text.includes('Trainer ') && event.text.includes(': '))
                add('radio', s.players[role === 'A' ? 'B' : 'A'].position, 'Partner radio');
        }
        if (s.phase === 'success' && before.phase !== 'success')
            add('extraction', s.players[role].position, 'Joint extraction confirmed');
        if (this.seen.size > 500)
            this.seen = new Set(s.events.map(e => e.id));
        return added;
    }
    active(now: number) { this.cues = this.cues.filter(c => now - c.at < c.duration); return this.cues; }
}
