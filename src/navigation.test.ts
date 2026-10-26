import { test } from 'node:test';
import assert from 'node:assert/strict';
import {cameraInput} from './gameInput';
import { defaultPresentation, sanitizePresentation } from './presentation';
import { rooms, center, doors, pathDirection, pathLength, move, distance, walkable, spawn, roomEquipment, roomPortals, controlPoint, obstacles } from './world';
import { initial, defaultConfig, injectionCheck, reduce } from './engine';
import { prepared, rollout } from '../server/analytics';
test('camera-relative keyboard and touch vectors are normalized and settings remain bounded',()=>{
 assert.ok(Math.abs(cameraInput(1,0).x)<1e-9);assert.equal(cameraInput(1,0).y,-1);assert.equal(cameraInput(0,1).x,1);assert.ok(Math.abs(cameraInput(0,1).y)<1e-9);assert.ok(Math.abs(Math.hypot(...Object.values(cameraInput(1,1)))-1)<1e-10);
    const safe = sanitizePresentation({ sensitivity: NaN, fov: 900, brightness: -1, minimapSize: 999 });
    assert.equal(safe.fov, 100);
    assert.equal(safe.brightness, .6);
    assert.equal(safe.minimapSize, 600);
    assert.equal(safe.sensitivity, .003);
});
test('every nonfinal room pair is traversable with optional routes closed; final extraction is gated', () => {
    const state = initial();

    assert.ok(doors(state).every(d => d.locked));
    for (const p of Object.values(spawn))
        assert.ok(walkable(p, state));
    for (const from of rooms.filter(r=>r.id!=='exit'))
        for (const to of rooms.filter(r=>r.id!=='exit')) {
            let p = center(from.id), target = center(to.id);
            assert.ok(Number.isFinite(pathLength(p, target, state)), from.id + ' to ' + to.id);
            for (let step = 0; step < 1800 && distance(p, target) > 35; step++) {
                const v = pathDirection(p, target, state), n = Math.hypot(v.x, v.y);
                assert.ok(n > 0, from.id + ' to ' + to.id);
                p = move(p, { x: v.x / n, y: v.y / n }, .07, state);
            }
            assert.ok(distance(p, target) < 40, from.id + ' to ' + to.id);
        }
    for (const t of state.tasks) {
        assert.ok(walkable(t.position, state));
        if (t.secondPosition)
            assert.ok(walkable(t.secondPosition, state));
    }
});
test('rebuilt map remains feasible under seeded actual-rule continuations with exactly six objectives and 300-second maximum', () => {
    for (const taskCount of [6])
        for (const seed of [1, 2, 3]) {
            const result = rollout(prepared({ ...defaultConfig, seed, taskCount }), seed);
            assert.ok(result.success, JSON.stringify({ taskCount, seed, result }));
            assert.ok(result.elapsed <= 300);
        }
});
test('open room centers, former central block sites, door approaches and both equipment controls stay clear', () => {
    const state = initial();
    state.phase = 'playing';
    assert.equal(roomEquipment.length, 16);
    for (const r of rooms) {
        const c = center(r.id);
        for (const dx of [-20, 0, 20])
            for (const dy of [-20, 0, 20])
                assert.ok(walkable({ x: c.x + dx, y: c.y + dy }, state), r.id + ' open center');
        assert.ok(walkable({ x: c.x, y: c.y + 50 }, state), r.id + ' former central block');
        const eq = roomEquipment.find(e => e.roomId === r.id)!;
        assert.ok(eq.depth <= 28);
        assert.ok(eq.edge.length >= eq.length + 16);
        for (const role of ['A', 'B'] as const) {
            const pos = controlPoint(r.id, role);
            assert.ok(walkable(pos, state, null, false, 18), r.id + ' standing clearance');
            assert.ok(Number.isFinite(pathLength(c, pos, state)), r.id + ' control route');
        }
        if (!['arrival', 'exit'].includes(r.id))
            assert.ok(injectionCheck(state, { kind: 'threat', pokemonId: 94, target: 'location', position: c, severity: 1, duration: 120, scope: 'either', blocking: false }).ok, r.id + ' clear threat spawn');
    }
    for (const portal of roomPortals)
        for (const offset of [-20, 0, 20]) {
            const p = { x: portal.start.x + portal.tangent.x * portal.length / 2 + portal.normal.x * offset, y: portal.start.y + portal.tangent.y * portal.length / 2 + portal.normal.y * offset };
            assert.ok(walkable(p, undefined, null, false, 12), portal.roomId + ' entrance');
        }
});
test('companions never become collision blockers in a doorway or room lane', () => {
    let before = prepared(defaultConfig);
    for (let i = 0; i < 12; i++)
        before = reduce(before, { type: 'FRAME', value: .25 });
    before.players.A.position = center('hub');
    const compare = (follower: {
        x: number;
        y: number;
    }) => { let s = structuredClone(before); s.players.A.follower = follower; s = reduce(s, { type: 'INPUT', role: 'A', value: { x: 1, y: 0 } }); return reduce(s, { type: 'FRAME', value: .25 }).players.A.position; };
    assert.deepEqual(compare({ ...before.players.A.position }), compare({ x: 0, y: 0 }));
});
