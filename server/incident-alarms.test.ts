import test from "node:test";
import assert from "node:assert/strict";
import { prepared } from "./analytics";
import { reduce, defaultConfig, type State } from "../src/engine";
import { center } from "../src/world";
import { dangerIncident } from "../src/incidentAlarm";
function live() {
  let state = prepared({ ...defaultConfig, eventCooldown: 0 });
  for (let i = 0; i < 12; i++)
    state = reduce(state, { type: "FRAME", value: 0.25 });
  state.players.A.position = center("arrival");
  state.players.B.position = center("hub");
  return state;
}
const inject = (s: State, kind: "threat" | "emergency") =>
  reduce(s, {
    type: "INJECT",
    role: "control",
    value:
      kind === "threat"
        ? {
            kind,
            pokemonId: 133,
            target: "B",
            severity: 1,
            duration: 120,
            scope: "either",
            blocking: false,
          }
        : {
            kind,
            eventKind: "blackout",
            target: "B",
            severity: 1,
            duration: 60,
            scope: "either",
            blocking: true,
          },
  });
test('alarms persist beyond the introduction and reconnect, without depending on a local played list',()=>{
 const s=inject(live(),'threat');assert.equal(dangerIncident(s)?.id,s.threats[0].instanceId);
 assert.equal(dangerIncident({...s,elapsed:s.elapsed+45})?.id,s.threats[0].instanceId);
 assert.equal(dangerIncident(structuredClone(s))?.kind,'pokemon');
});
test('emergency overrides Pokemon, clearing it restores the unresolved Pokemon warning',()=>{
 const s=inject(inject(live(),'threat'),'emergency');assert.equal(dangerIncident(s)?.kind,'emergency');
 s.emergencies[0].status='resolved';assert.equal(dangerIncident(s)?.kind,'pokemon');
 s.threats[0].status='contained';assert.equal(dangerIncident(s),undefined);
});
test('battle engagement stops the Pokemon warning, retreat restores it; pause/end/cancel stop alarms',()=>{
 const s=inject(live(),'threat'),id=s.threats[0].instanceId;
 s.players.B.encounterId=id;assert.equal(dangerIncident(s),undefined);
 s.players.B.encounterId=null;assert.equal(dangerIncident(s)?.id,id);
 assert.equal(dangerIncident({...s,paused:true}),undefined);assert.equal(dangerIncident({...s,phase:'failed'}),undefined);
 s.threats[0].status='cancelled';assert.equal(dangerIncident(s),undefined);
});
