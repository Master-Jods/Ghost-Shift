import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "./engine";
import { center, move, distance, walkable } from "./world";
import { MovementPrediction, type MovementStatus } from "./movementPrediction";
const status = (extra: Partial<MovementStatus> = {}): MovementStatus => ({
  direction: { x: 0, y: 0 },
  seq: 0,
  ackSeq: 0,
  changedAt: 0,
  receivedAt: 0,
  rtt: 200,
  connected: true,
  ...extra,
});
function setup() {
  const state = initial();
  state.phase = "playing";
  state.players.A.position = center("hub");
  return state;
}
test("local movement starts before a delayed acknowledgement, without changing authoritative position", () => {
  const state = setup(),
    predict = new MovementPrediction(),
    start = { ...state.players.A.position };
  predict.step(state, "A", status(), 0, 0, true);
  let view = start;
  for (let n = 1; n <= 10; n++)
    view = predict.step(
      state,
      "A",
      status({ direction: { x: 1, y: 0 }, seq: 1 }),
      n * 16,
      0.016,
      true,
    );
  assert(distance(view, start) > 25);
  assert.deepEqual(state.players.A.position, start);
  assert(walkable(view, state));
  const stopped = predict.step(
    state,
    "A",
    status({ direction: { x: 0, y: 0 }, seq: 2 }),
    176,
    0.016,
    true,
  );
  assert.deepEqual(
    stopped,
    view,
    "Stopping must not wait for a server round trip.",
  );
});
test("prediction is bounded during connection stalls and never crosses canonical walls", () => {
  const state = setup(),
    predict = new MovementPrediction(),
    input = status({ direction: { x: 1, y: 0 }, seq: 1 });
  let view = predict.step(state, "A", input, 0, 0, true);
  for (let n = 1; n <= 80; n++)
    view = predict.step(state, "A", input, n * 16, 0.016, true);
  const frozen = { ...view };
  for (let n = 81; n <= 110; n++)
    view = predict.step(state, "A", input, n * 16, 0.016, true);
  assert.deepEqual(view, frozen);
  for (let n = 0; n < 500; n++) {
    state.worldTime += 0.016;
    input.receivedAt = n * 16;
    view = predict.step(state, "A", input, n * 16, 0.016, true);
    assert(walkable(view, state));
  }
});
test("server reconciliation respects collision, teleports, paused/end states and disconnection", () => {
  const state = setup(),
    predict = new MovementPrediction(),
    input = status({ direction: { x: 1, y: 0 }, seq: 1 });
  predict.step(state, "A", input, 0, 0, true);
  const start = { ...state.players.A.position };
  let predicted = predict.step(state, "A", input, 100, 0.06, true);
  state.players.A.position = move(start, { x: 1, y: 0 }, 0.1, state);
  state.worldTime = 0.1;
  input.ackSeq = 1;
  input.receivedAt = 100;
  predicted = predict.step(state, "A", input, 116, 0.016, true);
  assert(walkable(predicted, state));
  assert(distance(predicted, state.players.A.position) < 25);
  state.players.A.position = center("arrival");
  state.worldTime = 0.2;
  assert.deepEqual(
    predict.step(state, "A", input, 132, 0.016, true),
    state.players.A.position,
  );
  state.paused = true;
  assert.deepEqual(
    predict.step(state, "A", input, 148, 0.016, true),
    state.players.A.position,
  );
  state.paused = false;
  assert.deepEqual(
    predict.step(state, "A", { ...input, connected: false }, 164, 0.016, true),
    state.players.A.position,
  );
});
