import { useEffect, useState } from 'react';
import { defaultPresentation, type PresentationSettings, type VisualCue } from './presentation';
export function PresentationSettingsPanel({ value, onChange }: {
    value: PresentationSettings;
    onChange: (v: PresentationSettings) => void;
}) {
    const update = <K extends keyof PresentationSettings>(key: K, next: PresentationSettings[K]) => onChange({ ...value, [key]: next });
    const slider = (key: keyof PresentationSettings, label: string, min: number, max: number, step: number, digits = 2) => <label key={key}>{label}<span className="setting-value">{Number(value[key]).toFixed(digits)}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={Number(value[key])} onChange={e => update(key, +e.target.value)}/></label>;
    const toggle = (key: keyof PresentationSettings, label: string) => <label className="toggle" key={key}><input type="checkbox" checked={!!value[key]} onChange={e => update(key, e.target.checked)}/>{label}</label>;
    return <div className="terminal-settings"><span className="eyebrow">PERSONAL EQUIPMENT / LOCAL DEVICE PREFERENCES</span><h2>Player settings</h2><p className="settings-note">Changes apply immediately. Opening settings does not pause the shared mission.</p><div className="settings-columns">
 <section><h3>Controls</h3>{slider('sensitivity', 'Look sensitivity', .0001, .008, .0001, 4)}<label>Numeric mouse sensitivity<input aria-label="Numeric mouse sensitivity" type="number" min="0.0001" max="0.008" step="0.0001" value={value.sensitivity} onChange={e => update('sensitivity', Math.max(.0001, Math.min(.008, +e.target.value || .0001)))}/></label>{slider('touchSensitivity', 'Touch look sensitivity', .001, .015, .0005, 4)}{toggle('invertY', 'Invert Y')}{toggle('smoothing', 'Mouse smoothing')}<small>Radians per pixel; smoothing defaults off. WASD/arrows move · Mouse/right-side drag look · E interact · Q team · M map/objectives · F flashlight · Escape close/release.</small></section>
 <section><h3>Camera</h3>{slider('fov', 'Field of view', 60, 100, 1, 0)}{slider('headBob', 'Head bob intensity', 0, 1, .05)}{slider('cameraShake', 'Camera shake intensity', 0, 1, .05)}{toggle('reducedMotion', 'Reduced camera and tool motion')}{toggle('reducedFlashes', 'Reduced flashing')}<small>Camera motion is cosmetic and does not change interaction direction.</small></section>
 <section><h3>Graphics</h3><label>Render quality<select aria-label="Render quality" value={value.quality} onChange={e => update('quality', e.target.value as PresentationSettings['quality'])}><option value="low">Low</option><option value="standard">Medium</option><option value="high">High</option></select></label>{slider('renderScale', 'Render scale', .5, 1.5, .1)}{toggle('shadows', 'Contact and flashlight shadows')}{toggle('postProcessing', 'Film / atmospheric post-processing')}{slider('brightness', 'Brightness', .6, 1.6, .05)}{toggle('showFps', 'FPS display')}</section>
 <section><h3>Audio</h3><label className="toggle"><input type="checkbox" checked={!value.muted} onChange={e => update('muted', !e.target.checked)}/>Enable facility audio</label><p className="settings-note">Original procedural audio. Starts after your interaction.</p>{(['master', 'effects', 'ambience'] as const).map(key => slider(key, key + ' volume', 0, 1, .01))}<button onClick={() => update('muted', !value.muted)}>{value.muted ? 'Unmute' : 'Mute all audio'}</button></section>
 <section><h3>Interface</h3>{slider('minimapSize', 'Minimap size', 180, 600, 10, 0)}<label>Minimap orientation<select aria-label="Minimap orientation" value={value.minimapOrientation} onChange={e => update('minimapOrientation', e.target.value as 'north' | 'heading')}><option value="north">North up</option><option value="heading">Heading up</option></select></label>{slider('hudScale', 'HUD scale', .8, 1.3, .05)}</section>
 </div><button onClick={() => onChange({ ...defaultPresentation })}>Reset to Defaults</button></div>;
}
export function ActionFeedback() {
    const [cue, setCue] = useState<VisualCue | null>(null), [submitted, setSubmitted] = useState(false);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const feedback = (event: Event) => {
            const next = (event as CustomEvent<VisualCue>).detail;
            if (['radio', 'step'].includes(next.kind))
                return;
            setCue(next);
            setSubmitted(false);
            clearTimeout(timer);
            timer = setTimeout(() => setCue(null), 1800);
        };
        const intent = () => { setSubmitted(true); clearTimeout(timer); timer = setTimeout(() => setSubmitted(false), 800); };
        window.addEventListener('ghost-feedback', feedback);
        window.addEventListener('ghost-intent', intent);
        return () => { clearTimeout(timer); window.removeEventListener('ghost-feedback', feedback); window.removeEventListener('ghost-intent', intent); };
    }, []);
    if (!cue && !submitted)
        return null;
    return <div className={'equipment-feedback ' + (submitted ? 'pending' : cue?.kind)} role="status"><span>{submitted ? 'UPLINK /' : 'EQUIPMENT /'}</span><strong>{submitted ? 'Action submitted' : cue?.label}{!submitted && cue?.amount !== undefined ? ` / ${cue.amount}` : ''}</strong><small>{submitted ? 'Awaiting authoritative response' : 'Server-confirmed state'}</small></div>;
}
