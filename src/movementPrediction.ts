import { move, distance, type Vec } from "./world.js";
import type { State } from "./engine.js";
export type MovementStatus = {
  direction: Vec;
  seq: number;
  changedAt: number;
  receivedAt: number;
  ackSeq: number;
  rtt: number;
  connected: boolean;
};
/** Visual prediction only. Interaction positions, clocks and collision remain authoritative. */
export class MovementPrediction {
  private session = "";
  private role = "";
  private position: Vec | null = null;
  private snapshot = -1;
  error = 0;
  step(
    state: State,
    role: "A" | "B",
    input: MovementStatus,
    now: number,
    dt: number,
    enabled: boolean,
  ): Vec {
    const player = state.players[role],
      authoritative = player.position;
    if (!this.position || this.session !== state.id || this.role !== role) {
      this.session = state.id;
      this.role = role;
      this.position = { ...authoritative };
      this.snapshot = -1;
    }
    const active =
      input.connected &&
      state.phase === "playing" &&
      !state.paused &&
      !player.exit;
    if (!active) {
      this.position = { ...authoritative };
      this.error = 0;
      return this.position;
    }
    const fresh = now - input.receivedAt < 500,
      direction = enabled && fresh ? input.direction : { x: 0, y: 0 };
    this.position = move(
      this.position,
      direction,
      Math.min(0.06, Math.max(0, dt)),
      state,
    );
    if (this.snapshot !== state.worldTime) {
      this.snapshot = state.worldTime;
      this.error = distance(this.position, authoritative);
      if (this.error > 120) {
        this.position = { ...authoritative };
      } else if (input.ackSeq >= input.seq) {
        const lead =
            enabled && fresh
              ? Math.min(0.15, Math.max(0, input.rtt / 2000))
              : 0,
          target = move(authoritative, direction, lead, state),
          gap = distance(this.position, target);
        if (gap > 0.1) {
          const fraction =
              Math.hypot(direction.x, direction.y) > 0.01 ? 0.18 : 0.45,
            amount = gap * fraction;
          this.position = move(
            this.position,
            {
              x: (target.x - this.position.x) / gap,
              y: (target.y - this.position.y) / gap,
            },
            amount / 185,
            state,
          );
        }
      }
    }
    return { ...this.position };
  }
}
