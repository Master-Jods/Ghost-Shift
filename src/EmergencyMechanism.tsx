import { useState } from "react";
import type { Emergency, State } from "./engine";
import { EMERGENCIES } from "./content";
import { channelLabels } from "./taskLabels";
export default function EmergencyMechanism({
  emergency: e,
  state,
  role,
  onRespond,
  onRequest,
}: {
  emergency: Emergency;
  state: State;
  role: "A" | "B";
  onRespond: (answer: Record<string, unknown>) => Promise<unknown>;
  onRequest: (plan: "balanced" | "priority") => void;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const def = EMERGENCIES.find((v) => v.kind === e.kind)!,
    remaining = Math.max(0, e.expiresAt - state.elapsed),
    request = state.request?.eventId === e.id ? state.request : null,
    permitted = ["both", "either", role].includes(e.scope),
    carrierAllowed = !e.carrier || e.scope === "both" || e.carrier === role;
  const respond = async (answer: Record<string, unknown> = {}) => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onRespond(answer);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Response could not be saved. Retry at the marked terminal.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="emergency-mechanism" data-emergency-id={e.id}>
      <div className="emergency-summary">
        <div>
          <span className="eyebrow">
            LIVE INCIDENT / {e.status.toUpperCase()}
          </span>
          <h2>{e.name}</h2>
        </div>
        <div
          className="emergency-timer"
          role="timer"
          aria-label="Emergency time remaining"
        >
          <small>
            {e.status === "active" ? "Time remaining" : "Incident status"}
          </small>
          <strong>
            {e.status === "active"
              ? remaining + "s"
              : e.status === "resolved"
                ? "Safe"
                : "Closed"}
          </strong>
        </div>
      </div>
      <p>{def.objective}</p>
      <ol className="response-instructions">
        <li>Reach the marked emergency equipment; use E / Interact.</li>
        <li>
          {e.kind === "corruption"
            ? "Retrieve the fragment here, carry it to Rotom Relay Station, then complete the upload controls."
            : e.kind === "overload"
              ? "Propose a reset plan, obtain partner approval, then complete the reset controls."
              : e.scope === "both"
                ? "Both trainers use their separate controls within 12 active seconds for each round."
                : "Read the target channel and select its matching button for each reset."}
        </li>
        <li>Complete every required reset before the timer runs out.</li>
      </ol>
      {e.status === "active" && (
        <p className="emergency-deadline">
          Missing this deadline ends the session immediately. Opening this
          terminal does not pause the 60-second timer.
        </p>
      )}
      {error && (
        <p className="task-feedback error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <p className="task-feedback" role="status">
          Saving emergency response...
        </p>
      )}
      {e.status !== "active" ? (
        <div className="task-feedback" role="status">
          Incident {e.status}. Its environmental effects have been cleaned up.
        </div>
      ) : !permitted ? (
        <p className="task-feedback">
          Trainer {e.scope} must respond to this emergency. Follow your own
          assigned tasks.
        </p>
      ) : !carrierAllowed ? (
        <p className="task-feedback">
          Trainer {e.carrier} carries the fragment and must complete this
          upload.
        </p>
      ) : e.kind === "overload" && !e.allocated ? (
        <>
          {request?.status === "pending" ? (
            <div className="task-feedback" role="status">
              Waiting for Trainer {request.by === "A" ? "B" : "A"} to approve
              the reset plan. The emergency timer continues.
            </div>
          ) : (
            <div className="response-plans">
              <article>
                <h3>Paired stabilization</h3>
                <p>
                  Standard reset sequence. Your partner must approve before work
                  starts.
                </p>
                <button
                  disabled={pending}
                  onClick={() => onRequest("balanced")}
                >
                  Propose paired stabilization
                </button>
              </article>
              <article>
                <h3>Local bypass</h3>
                <p>
                  One extra reset is required. Your partner must approve this
                  plan too.
                </p>
                <button
                  disabled={pending}
                  onClick={() => onRequest("priority")}
                >
                  Propose local bypass
                </button>
              </article>
            </div>
          )}
        </>
      ) : e.kind === "corruption" && !e.carrier ? (
        <div className="task-submit">
          <p>Pick up the fragment before moving to the upload terminal.</p>
          <button
            className="primary"
            disabled={pending}
            onClick={() => void respond()}
          >
            Retrieve data fragment
          </button>
        </div>
      ) : e.scope === "both" ? (
        <>
          <div className="response-progress">
            <span>Paired progress</span>
            <strong>
              {e.progress} / {e.steps}
            </strong>
          </div>
          <div className="stabilizer-pair">
            {(["A", "B"] as const).map((r) => (
              <article key={r} data-ready={e.responses[r] !== undefined}>
                <h3>
                  Trainer {r}
                  {r === role ? " / You" : ""}
                </h3>
                <strong>
                  {e.responses[r] === undefined
                    ? "Waiting"
                    : `${Math.max(0, 12 - (state.worldTime - e.responses[r]!)).toFixed(0)}s pairing window`}
                </strong>
              </article>
            ))}
          </div>
          <div className="task-submit">
            <p>
              Activate separate controls within the pairing window. If the
              window resets, try both controls again.
            </p>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void respond()}
            >
              Activate my emergency control
            </button>
          </div>
        </>
      ) : (
        <>
          <section
            className="response-target"
            aria-label="Required emergency channel"
          >
            <span>
              Reset {e.progress + 1} / {e.steps}
            </span>
            <strong>
              Required channel {channelLabels[e.pattern[e.progress] ?? 0]}
            </strong>
          </section>
          <div className="task-buttons response-channels">
            {channelLabels.map((label, n) => (
              <button
                disabled={pending}
                key={label}
                onClick={() => void respond({ answer: n })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="response-hint">
            Choose the matching channel. An incorrect channel does not advance
            this reset.
          </p>
        </>
      )}
    </div>
  );
}
