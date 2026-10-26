import { useEffect, useId, useState } from "react";
import { coolantReadings, type Task } from "./engine";
import {
  channelLabels as marks,
  coolantLabels,
  coolantValue,
  taskInstructions,
} from "./taskLabels";
const valveNames = ["Inlet", "Bypass", "Return"];
const valveEffects = [
  "Changes pressure and flow.",
  "Changes all three readings.",
  "Changes flow and temperature.",
];
const signalValue = (index: number, n: number) =>
  index === 0 ? `${500 + n * 25} MHz` : `${n * 90} degrees`;
export default function TaskMechanism({
  task: t,
  time,
  role,
  onInput,
}: {
  task: Task;
  time: number;
  role: "A" | "B";
  onInput: (answer: unknown) => void | Promise<unknown>;
}) {
  const id = useId(),
    colors = ["#e89f83", "#9bcce0", "#c1a8e6", "#d9c284"];
  const [selected, setSelected] = useState(0),
    [values, setValues] = useState<number[]>([0, 0, 0, 0]),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [showFeedback, setShowFeedback] = useState(false),
    [edited, setEdited] = useState(false);
  useEffect(() => {
    setValues(t.mode === "wiring" ? [...t.connections] : [0, 0, 0, 0]);
    setSelected(0);
    setMessage("");
    setShowFeedback(false);
  }, [t.id]);
  useEffect(() => {
    setEdited(false);
  }, [t.errors]);
  const change = (index: number, value: number) => {
    setValues((v) => v.map((n, i) => (i === index ? value : n)));
    setEdited(true);
    setMessage("");
  };
  const submit = async (answer: unknown) => {
    if (pending) return;
    setPending(true);
    setMessage("");
    setEdited(false);
    try {
      await onInput(answer);
    } catch (error) {
      setShowFeedback(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save. Please retry.",
      );
    } finally {
      setPending(false);
    }
  };
  const selectors = (count: number, offset = 0) => (
    <div className="task-selectors">
      {Array.from({ length: count }, (_, i) => {
        const label =
          t.mode === "signal" ? ["Frequency", "Phase"][i] : `Selector ${i + 1}`;
        return (
          <label key={i}>
            {label}
            <select
              aria-label={label}
              value={values[i]}
              disabled={pending}
              onChange={(e) => change(i, +e.target.value)}
            >
              {marks.map((m, n) => (
                <option key={m} value={n}>
                  {t.mode === "signal" ? signalValue(i, n) : m}
                </option>
              ))}
            </select>
            <small>
              Target:{" "}
              {t.mode === "signal"
                ? signalValue(i, t.pattern[i])
                : marks[t.pattern[offset + i]]}
            </small>
          </label>
        );
      })}
    </div>
  );
  const targetItems =
    t.mode === "signal"
      ? t.pattern.map((n, i) => ({
          label: ["Frequency", "Phase"][i],
          value: signalValue(i, n),
        }))
      : t.mode === "cooperative"
        ? t.pattern
            .slice(role === "A" ? 0 : 2, role === "A" ? 2 : 4)
            .map((n, i) => ({
              label: `Your selector ${i + 1}`,
              value: marks[n],
            }))
        : t.pattern.map((n, i) => ({
            label: `${t.mode === "wiring" ? "Lead" : t.mode === "transfer" ? "Checksum" : "Selector"} ${i + 1}`,
            value: marks[n],
          }));
  const readings = coolantReadings(values),
    targets = coolantReadings(t.pattern),
    safe = readings.map((n, i) => Math.abs(n - targets[i]) <= 2),
    allSafe = safe.every(Boolean);
  return (
    <div className={`mechanism task-${t.mode}`} data-task-id={t.id}>
      <p className="mechanism-instructions">{taskInstructions[t.mode]}</p>
      <div className="mechanism-status" role="status">
        <span>
          {pending
            ? "Saving changes..."
            : t.mode === "wiring"
              ? `${t.progress} of 4 connections saved`
              : t.mode === "cooperative"
                ? `${Object.keys(t.setup).length} of 2 local setups saved`
                : "Settings are applied when you validate."}
        </span>
        <span>Retries: {t.errors}</span>
      </div>
      {(showFeedback || t.errors > 0) && (
        <p className="task-feedback" role={message ? "alert" : "status"}>
          {message ||
            (pending
              ? "Checking the submitted settings..."
              : edited
                ? "Settings changed. Check the targets and validate again."
                : "The last validation did not match. Check the targets and retry; saved progress is preserved.")}
        </p>
      )}
      {t.mode !== "coolant" &&
        (t.mode !== "transfer" || t.carrier === role) && (
          <section className="terminal-targets" aria-label="Terminal targets">
            <h3>
              {t.mode === "cooperative"
                ? `Trainer ${role} setup targets`
                : "Target settings"}
            </h3>
            <dl>
              {targetItems.map((item, i) => (
                <div key={i}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      {t.mode === "wiring" ? (
        <>
          <h3>1. Select a lead</h3>
          <div className="task-buttons wire-leads">
            {t.pattern.map((n, i) => (
              <button
                key={i}
                style={{ borderColor: colors[n] }}
                aria-label={`Lead ${i + 1}`}
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
                className={selected === i ? "selected" : ""}
              >
                <b>
                  Lead {i + 1}: {marks[n]}
                </b>
                <small>
                  {t.connections[i] === n
                    ? "SAVED"
                    : values[i] === -1
                      ? "UNCONNECTED"
                      : values[i] === n
                        ? "MATCHED"
                        : "CHECK CONNECTION"}
                </small>
              </button>
            ))}
          </div>
          <h3>2. Choose a socket for lead {selected + 1}</h3>
          <div className="task-buttons wire-sockets">
            {marks.map((m, n) => (
              <button
                key={m}
                disabled={pending}
                style={{ borderColor: colors[n] }}
                aria-label={`Socket ${m}`}
                onClick={() => {
                  const next = [...values];
                  next[selected] = n;
                  setValues(next);
                  void submit({ connections: next, test: false });
                }}
              >
                Socket {m}
              </button>
            ))}
          </div>
          <div className="task-submit">
            <p>
              All four correct connections must be saved before the circuit test
              passes.
            </p>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void submit({ connections: values, test: true })}
            >
              Test wiring circuit
            </button>
          </div>
        </>
      ) : t.mode === "routing" ? (
        <>
          <svg
            className="circuit-preview"
            viewBox="0 0 400 80"
            aria-label="Three circuit route selectors"
          >
            <path d="M5 40H395" stroke="#bba783" strokeWidth="4" />
            {t.pattern.map((n, i) => (
              <g key={i}>
                <rect
                  x={55 + i * 120}
                  y="10"
                  width="55"
                  height="60"
                  rx="5"
                  fill={values[i] === n ? "#416a51" : "#582d34"}
                />
                <text x={82 + i * 120} y="47" textAnchor="middle" fill="white">
                  {marks[values[i]]}
                </text>
              </g>
            ))}
          </svg>
          {selectors(3)}
          <div className="task-submit">
            <p>
              Validation powers Shortcut {t.option} and closes Shortcut{" "}
              {t.option === "A" ? "B" : "A"}. The fallback route remains
              available.
            </p>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void submit(values.slice(0, 3))}
            >
              Validate power circuit
            </button>
          </div>
        </>
      ) : t.mode === "signal" ? (
        <>
          {selectors(2)}
          <p
            className="alignment-status"
            data-ready={
              values[0] === t.pattern[0] && values[1] === t.pattern[1]
            }
          >
            {values[0] === t.pattern[0] && values[1] === t.pattern[1]
              ? "Alignment locked. Ready to validate."
              : "Adjust frequency and phase to match both targets."}
          </p>
          <div className="task-submit">
            <button
              className="primary"
              disabled={pending}
              onClick={() => void submit(values.slice(0, 2))}
            >
              Validate signal alignment
            </button>
          </div>
        </>
      ) : t.mode === "coolant" ? (
        <>
          <section
            className="coolant-readings"
            aria-label="Live coolant readings"
          >
            {readings.map((n, i) => (
              <article className="coolant-reading" data-safe={safe[i]} key={i}>
                <h3>{coolantLabels[i]}</h3>
                <output
                  aria-label={`Current ${coolantLabels[i].toLowerCase()}`}
                >
                  {coolantValue(i, n)}
                </output>
                <span>Target: {coolantValue(i, targets[i])}</span>
                <meter
                  aria-label={`${coolantLabels[i]} safe range`}
                  min={0}
                  max={[120, 50, 40][i]}
                  low={targets[i] - 2}
                  high={targets[i] + 2}
                  optimum={targets[i]}
                  value={n}
                />
                <small>
                  Safe: {targets[i] - 2} to {coolantValue(i, targets[i] + 2)}
                </small>
                <b>
                  {safe[i]
                    ? "In safe range"
                    : n < targets[i]
                      ? "Too low"
                      : "Too high"}
                </b>
              </article>
            ))}
          </section>
          <h3 className="valve-heading">Adjust valve positions</h3>
          <p className="valve-hint">
            Valves affect more than one reading. Use positions 0-3; check all
            three readings together.
          </p>
          <div className="valve-bank">
            {valveNames.map((name, i) => (
              <fieldset className="valve-control" key={name}>
                <legend>{name} valve</legend>
                <p>{valveEffects[i]}</p>
                <div className="valve-value">
                  <label htmlFor={`${id}-valve-${i}`}>
                    {name} ({i + 1})
                  </label>
                  <output htmlFor={`${id}-valve-${i}`}>
                    Position {values[i]}
                  </output>
                </div>
                <input
                  id={`${id}-valve-${i}`}
                  aria-label={`Valve ${i + 1}`}
                  aria-valuetext={`${name} valve: position ${values[i]}`}
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={values[i]}
                  onInput={(e) =>
                    change(i, +(e.target as HTMLInputElement).value)
                  }
                  onChange={(e) => change(i, +e.target.value)}
                />
                <div
                  className="valve-stops"
                  aria-label={`${name} valve exact positions`}
                >
                  {[0, 1, 2, 3].map((n) => (
                    <button
                      type="button"
                      key={n}
                      aria-label={`Set ${name.toLowerCase()} valve to ${n}`}
                      aria-pressed={values[i] === n}
                      onClick={() => change(i, n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="task-submit">
            <p className="alignment-status" role="status" data-ready={allSafe}>
              {allSafe
                ? "All three readings are safe. Validate to save the balance."
                : "Match the pressure, flow and temperature safe ranges before validating."}
            </p>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void submit(values.slice(0, 3))}
            >
              Validate coolant balance
            </button>
          </div>
        </>
      ) : t.mode === "transfer" ? (
        !t.carrier ? (
          <div className="task-submit">
            <p>
              Collect the module here, then carry it to the upload terminal at
              Rotom Relay Station.
            </p>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void submit({ retrieve: true })}
            >
              Retrieve research module
            </button>
          </div>
        ) : t.carrier !== role ? (
          <p className="task-feedback">
            Trainer {t.carrier} is carrying the module. Only that trainer can
            upload it at Rotom Relay Station.
          </p>
        ) : (
          <>
            {selectors(3)}
            <div className="task-submit">
              <p>
                Module secured by Trainer {t.carrier}. Enter the checksum at the
                Rotom Relay upload terminal.
              </p>
              <button
                className="primary"
                disabled={pending}
                onClick={() => void submit(values.slice(0, 3))}
              >
                Verify and upload module
              </button>
            </div>
          </>
        )
      ) : (
        <>
          <div className="stabilizer-pair">
            {(["A", "B"] as const).map((r) => (
              <article key={r} data-ready={!!t.setup[r]}>
                <h3>
                  Trainer {r}
                  {r === role ? " / You" : ""}
                </h3>
                <span>{t.setup[r] ? "Setup ready" : "Setup required"}</span>
                <strong>
                  {t.activated[r] === undefined
                    ? "Not activated"
                    : `${Math.max(0, 12 - (time - t.activated[r]!)).toFixed(0)}s pairing window`}
                </strong>
              </article>
            ))}
          </div>
          {!t.setup[role] ? (
            <>
              {selectors(2, role === "A" ? 0 : 2)}
              <div className="task-submit">
                <button
                  className="primary"
                  disabled={pending}
                  onClick={() => void submit({ setup: values.slice(0, 2) })}
                >
                  Validate local setup
                </button>
              </div>
            </>
          ) : (
            <div className="task-submit">
              <p>
                {t.setup[role === "A" ? "B" : "A"]
                  ? "Both setups are ready. Coordinate activation within 12 seconds."
                  : "Your setup is saved. Ask your partner to finish their setup before activating."}
              </p>
              <button
                className="primary"
                disabled={pending}
                onClick={() => void submit({ activate: true })}
              >
                Activate stabilizer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
