# Operator Analytics dashboard: what each tab shows

The top cards summarize current-scenario sessions: saved sessions (history is capped at 150 persisted sessions plus the current round if absent), joint-extraction rate among finished runs, mean elapsed completion time of successful runs only, and resolved injected emergencies. Historical records refresh every five seconds; the current round is overlaid from live state.

## Overview & flow

- Objective Completion Funnel: number and percentage of finished sessions that reached at least 1, 2, ... 6 completed normal tasks. This is not a fixed task order; tasks run in parallel.
- Run Termination Distribution: actual joint extractions, fatal emergency deadlines, mission deadlines, and other ended runs. Ongoing sessions are excluded.
- Recent Session Completion: elapsed active seconds of up to 12 finished sessions; green means successful, red means failed.
- Live Response Queue: active Pokemon/emergencies and remaining mission seconds in the live round.

## Incidents & response

Groups injections by Pokemon encounters or emergency kind. Each card shows injections, resolved incidents, missed/expired incidents, operator cancellations, and mean recorded first-response delay. First response is not completion time. Pokemon expiry and emergency misses are separate gameplay outcomes; unresolved emergencies cause immediate session failure at 60 active seconds.

## Predictive & capacity

Conditional route/workload Monte Carlo evaluates current canonical routes/doors, remaining tasks, and known incident deadlines under generated human timing variation. It compares Parallel nearest, Assigned routes, A responder, and B responder policies. Conditional extraction percentage is successful simulations / all simulations. Successful remaining mean is additional time from the analyzed snapshot, among successful runs only. Computation is calculation latency, not gameplay duration. A joint action sequence shows estimated action completion times. Observed forecast-pair count and MAE report available forecast-versus-actual successful-time error; this is not proof of visitor calibration.

Example: 64/64 means every generated timing sample met the known deadlines. It does not guarantee players will win, nor predict unknown future operator injections. Predictions use a bounded route/workload model, not full Showdown battle simulation. A 0% or 100% result must be read with those assumptions.

## Prescriptive sequence

Immediate A/B instructions and a joint sequence of estimated actions. Current live guidance is recalculated from player positions, unfinished objectives, incident urgency, carrier/cooperative constraints and canonical closed-door routes. Closed shortcut alternatives expose key/companion/battle/route-switch costs. Completed tasks disappear from next actions even while forecast HTTP requests are unavailable. The joint next-action assignment is greedy and bounded; no global-optimum guarantee is claimed.

A sequence entry '+30s / Trainer A' means estimated action completion 30 seconds after the snapshot; A and B can act in parallel. It is not an observed completion or a command that moves the player automatically.

## Monte Carlo sandbox

Analyzes a cloned snapshot with a deadline between 120 and 300 seconds. The actual live session is unchanged. Use it to compare how deadline assumptions affect modeled extraction outcomes, not to change the players' timer.

Predictive, Prescriptive and Sandbox currently share the simulation-results panel. Their purpose and controls differ, but they are not three independent statistical systems. Logged history/observed metrics must remain distinguished from generated forecasts.
