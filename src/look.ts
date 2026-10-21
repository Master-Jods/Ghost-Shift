import type { PresentationSettings } from './presentation';
export type LookState = {
    yaw: number;
    pitch: number;
};
/** Radians per input pixel. No frame-time multiplier, roll, or simulation mutation. */
export function relativeLook(current: LookState, dx: number, dy: number, settings: PresentationSettings, touch = false): LookState {
    if (!Number.isFinite(dx) || !Number.isFinite(dy))
        return current;
    const gain = touch ? settings.touchSensitivity : settings.sensitivity;
    return { yaw: current.yaw + dx * gain, pitch: Math.max(-1.15, Math.min(1.15, current.pitch - dy * gain * (settings.invertY ? -1 : 1))) };
}
