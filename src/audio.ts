import type { CueKind, PresentationSettings } from './presentation';
import type { Vec } from './world';
/** Original synthesized sounds. One context, bounded voices, no downloaded audio. */
export class FacilityAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private effects: GainNode | null = null;
    private ambience: GainNode | null = null;
    private sources: AudioScheduledSourceNode[] = [];
    private noise: AudioBuffer | null = null;
    private voices = 0;
    private settings: PresentationSettings | null = null;
    private lastAlarm = -Infinity;
    private lastConfig = '';
    get ready() { return !!this.context && this.context.state === 'running'; }
    async unlock(settings: PresentationSettings) { this.settings = settings; if (settings.muted)
        return; try {
        if (!this.context) {
            const ctx = this.context = new AudioContext(), master = this.master = ctx.createGain(), effects = this.effects = ctx.createGain(), ambience = this.ambience = ctx.createGain(), limiter = ctx.createDynamicsCompressor();
            effects.connect(master);
            ambience.connect(master);
            master.connect(limiter);
            limiter.connect(ctx.destination);
            limiter.threshold.value = -16;
            limiter.ratio.value = 8;
            this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            const data = this.noise.getChannelData(0);
            let n = 581;
            for (let i = 0; i < data.length; i++) {
                n = (Math.imul(n, 1664525) + 1013904223) | 0;
                data[i] = (n >>> 0) / 2147483648 - 1;
            }
            const air = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
            air.buffer = this.noise;
            air.loop = true;
            filter.type = 'lowpass';
            filter.frequency.value = 320;
            const gain = ctx.createGain();
            gain.gain.value = .09;
            air.connect(filter).connect(gain).connect(ambience);
            air.start();
            const motor = ctx.createOscillator(), motorGain = ctx.createGain();
            motor.type = 'sine';
            motor.frequency.value = 54;
            motorGain.gain.value = .075;
            motor.connect(motorGain).connect(ambience);
            motor.start();
            this.sources.push(air, motor);
        }
        await this.context.resume();
        this.configure(settings);
    }
    catch { /* Browsers may deny audio until another explicit gesture. */ } }
    configure(settings: PresentationSettings, active = true) { this.settings = settings; if (!this.context)
        return; const key = JSON.stringify([settings.muted, settings.master, settings.effects, settings.ambience, active]); if (key === this.lastConfig)
        return; this.lastConfig = key; const t = this.context.currentTime; this.master?.gain.setTargetAtTime(settings.muted || !active ? 0 : settings.master, t, .06); this.effects?.gain.setTargetAtTime(settings.effects, t, .04); this.ambience?.gain.setTargetAtTime(settings.ambience, t, .1); }
    play(kind: CueKind, position: Vec, listener: Vec, yaw: number, surface = 'metal') {
        const ctx = this.context, s = this.settings;
        if (!ctx || ctx.state !== 'running' || !this.effects || s?.muted || this.voices > 12)
            return;
        if (['materialize', 'emergency'].includes(kind)) {
            if (ctx.currentTime - this.lastAlarm < 1.2)
                return;
            this.lastAlarm = ctx.currentTime;
        }
        const d = Math.hypot(position.x - listener.x, position.y - listener.y);
        if (d > 750)
            return;
        const pan = ctx.createStereoPanner(), gain = ctx.createGain();
        pan.pan.value = Math.max(-.85, Math.min(.85, Math.sin(Math.atan2(position.y - listener.y, position.x - listener.x) - yaw) * Math.min(1, d / 100)));
        gain.gain.value = .22 / (1 + d / 160);
        pan.connect(gain).connect(this.effects);
        this.voices++;
        const t = ctx.currentTime;
        let duration = .25;
        const tone = (frequency: number, length: number, type: OscillatorType = 'sine', offset = 0, end = frequency, volume = .5) => { const source = ctx.createOscillator(), envelope = ctx.createGain(); source.type = type; source.frequency.setValueAtTime(frequency, t + offset); source.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + offset + length); envelope.gain.setValueAtTime(.001, t + offset); envelope.gain.linearRampToValueAtTime(volume, t + offset + .008); envelope.gain.exponentialRampToValueAtTime(.001, t + offset + length); source.connect(envelope).connect(pan); source.start(t + offset); source.stop(t + offset + length + .02); source.onended = () => { source.disconnect(); envelope.disconnect(); }; duration = Math.max(duration, length + offset + .03); };
        const noise = (length: number, frequency: number, volume = .4) => { if (!this.noise)
            return; const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain(); source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .65; envelope.gain.setValueAtTime(volume, t); envelope.gain.exponentialRampToValueAtTime(.001, t + length); source.connect(filter).connect(envelope).connect(pan); source.start(t, Math.random()); source.stop(t + length); source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); }; duration = Math.max(duration, length); };
        switch (kind) {
            case 'step':
                noise(.09, surface === 'rubber' ? 230 : surface === 'concrete' ? 480 : 1050, .65);
                tone(surface === 'rubber' ? 75 : 115, .08, 'sine', 0, 40, .35);
                break;
            case 'door':
                noise(.5, 480, .35);
                tone(70, .5, 'triangle', 0, 46, .2);
                break;
            case 'task-success':
            case 'extraction':
                tone(440, .17);
                tone(660, .2, 'sine', .12);
                tone(880, .35, 'sine', .25);
                break;
            case 'task-error':
                tone(150, .18, 'triangle', 0, 90);
                break;
            case 'guard':
                tone(350, .28, 'triangle', 0, 110, .6);
                break;
            case 'support':
                tone(330, .3, 'sine', 0, 660);
                break;
            case 'attack':
                noise(.15, 1600);
                tone(180, .16, 'triangle', 0, 55);
                break;
            case 'impact':
                noise(.1, 600, .8);
                break;
            case 'contain':
                tone(650, .38, 'sine', 0, 120);
                break;
            case 'resolved':
                tone(330, .5, 'sine', 0, 880);
                break;
            case 'materialize':
                noise(.7, 700, .25);
                tone(110, .65, 'sine', 0, 65);
                tone(440, .14, 'triangle', .1, 220, .2);
                break;
            case 'emergency':
                tone(420, .18, 'sine');
                tone(330, .2, 'sine', .25);
                break;
            case 'radio':
                noise(.12, 1800, .2);
                tone(920, .07, 'sine', .04, 700, .2);
                break;
            case 'selection':
                tone(480, .14, 'sine', 0, 720, .3);
                break;
            default: tone(650, .055, 'triangle', 0, 420, .18);
        }
        setTimeout(() => { pan.disconnect(); gain.disconnect(); this.voices = Math.max(0, this.voices - 1); }, Math.ceil(duration * 1000) + 80);
    }
    dispose() { for (const source of this.sources) {
        try {
            source.stop();
            source.disconnect();
        }
        catch { }
    } this.sources = []; void this.context?.close(); this.context = null; this.master = this.effects = this.ambience = null; }
}
