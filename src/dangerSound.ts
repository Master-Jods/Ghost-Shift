/** Original facility alert: rounded two-note warning pulses and a low impact.
 * Render once at audio unlock, so injections never wait on a network download.
 * No looping sweep, square wave, or random noise; each pulse has a soft envelope.
 */
export type DangerKind = 'emergency' | 'pokemon';
export function dangerSamples(kind: DangerKind, sampleRate: number): Float32Array {
    const emergency = kind === 'emergency';
    const duration = emergency ? 2.85 : 2.05;
    const samples = new Float32Array(Math.ceil(duration * sampleRate));
    const starts = emergency ? [0, .27, .92, 1.19, 1.84, 2.11] : [0, .29, .96];
    const base = emergency ? 392 : 293.665;
    for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        let value = 0;
        // Subdued cinematic impact; smooth attack avoids an initial click.
        if (t < 1.3) {
            const impact = (1 - Math.exp(-t * 85)) * Math.exp(-t * 5.5);
            value += .19 * impact * Math.sin(2 * Math.PI * (72 * t + 4 * (1 - Math.exp(-t * 9))));
        }
        for (let p = 0; p < starts.length; p++) {
            const u = t - starts[p];
            if (u < 0 || u > .64) continue;
            const note = base * (p % 2 === 0 ? 1 : .75);
            const attack = Math.min(1, u / .018);
            const tail = Math.min(1, (.64 - u) / .16);
            const envelope = attack * attack * tail * Math.exp(-u * 4.5);
            const phase = 2 * Math.PI * note * u;
            value += .34 * envelope * (Math.sin(phase) + .18 * Math.sin(phase * 2) + .06 * Math.sin(phase * 3));
            // Quiet delayed reflections add room depth without piercing harmonics.
            if (u > .11) value += .035 * Math.exp(-(u - .11) * 8) * Math.sin(2 * Math.PI * note * (u - .11)) * Math.min(1, (u - .11) / .02) * tail;
        }
        samples[i] = value * Math.min(1, (duration - t) / .08);
    }
    return samples;
}
