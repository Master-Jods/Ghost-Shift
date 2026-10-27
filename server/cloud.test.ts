import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CloudService, type Auth } from "./cloud/service";
import { memoryPostgres } from "./cloud/testDatabase";
import {
  BRIEFING_VERSION,
  defaultConfig,
  reduce,
  type State,
} from "../src/engine";
import { MAP_SIGNATURE } from "../src/world";
import { PROTOCOL_VERSION } from "../src/protocol";
import { createCloudApp } from "./cloud/app";
import { WebSocket } from "ws";
const profile = (role: string) => ({
  fullName: "Student " + role,
  block: "BSIT 4A",
});
async function fixture() {
  const db = memoryPostgres(),
    a = new CloudService(db, { bootstrapPassword: "test-secret-12345" });
  await a.ready;
  const b = new CloudService(db);
  await b.ready;
  const login = await a.login("operator", "test-secret-12345"),
    op: Auth = { cookie: login.token },
    r = await a.create(login.operator.id),
    pa = await a.join(r.code, "A", profile("A")),
    pb = await b.join(r.code, "B", profile("B"));
  const aa = { bearer: pa.credential, connectionId: "socket-a" },
    ab = { bearer: pb.credential, connectionId: "socket-b" };
  await a.attach(r.sessionId, aa, "socket-a");
  await b.attach(r.sessionId, ab, "socket-b");
  return { db, a, b, op, r, pa, pb, aa, ab };
}
let seq = 0;
const cmd = (type: string, value?: unknown, extra: any = {}) => ({
  id: randomUUID(),
  seq: ++seq,
  type,
  value,
  ...extra,
});
async function start(f: Awaited<ReturnType<typeof fixture>>) {
  for (const [auth, ids] of [
    [f.aa, [1, 4, 7]],
    [f.ab, [25, 133, 150]],
  ] as const) {
    assert((await f.a.command(f.r.sessionId, auth, cmd("TEAM", ids))).ok);
    assert(
      (
        await f.b.command(
          f.r.sessionId,
          auth,
          cmd("ACK_BRIEFING", BRIEFING_VERSION),
        )
      ).ok,
    );
  }
  await f.a.snapshot(f.r.sessionId, f.aa, true);
  await f.b.snapshot(f.r.sessionId, f.ab, true);
  const started = await f.a.command(f.r.sessionId, f.op, cmd("START"));
  assert(started.ok, started.message);
  await f.db.query("UPDATE gs_rooms SET last_tick=last_tick-5000 WHERE id=$1", [
    f.r.sessionId,
  ]);
  await f.b.snapshot(f.r.sessionId, f.op);
}
test("Postgres state survives separate services, atomic duplicate injection, persisted analysis and private credentials", async () => {
  const f = await fixture();
  try {
    await start(f);
    const id = f.r.sessionId,
      s = await f.b.snapshot(id, f.aa);
    assert.equal(s.state.phase, "playing");
    const injection = {
      kind: "emergency",
      eventKind: "blackout",
      target: "A",
      scope: "either",
      severity: 1,
      duration: 90,
      blocking: false,
    };
    const { preview } = await f.a.preview(id, f.op, {
      type: "INJECT",
      value: injection,
    });
    const action = cmd("CONFIRM_PREVIEW", undefined, { previewId: preview.id });
    const [one, two] = await Promise.all([
      f.a.command(id, f.op, action),
      f.b.command(id, f.op, action),
    ]);
    assert(one.ok, one.message);
    assert.deepEqual(one, two);
    const current = await f.b.snapshot(id, f.op);
    assert.equal(current.state.emergencies.length, 1);
    assert.equal(
      current.state.emergencies[0].expiresAt -
        current.state.emergencies[0].createdAt,
      60,
    );
    assert(current.state.emergencies[0].blocking);
    const guidance = (await f.b.analyze(id, f.aa)) as any;
    assert(guidance.best);
    assert.equal((await f.a.job(guidance.jobId, f.aa)).status, "complete");
    await assert.rejects(
      () => f.a.job(guidance.jobId, f.ab),
      /another identity/,
    );
    const rebuilt = new CloudService(f.db);
    await rebuilt.ready;
    assert.equal(
      (await rebuilt.snapshot(id, f.op)).state.emergencies.length,
      1,
    );
    const logs = await f.a.activityPage(
      (await f.a.operator(f.op)).id,
      new URLSearchParams({ sessionId: id }),
    );
    assert(logs.rows.some((v) => v.full_name === "Student A"));
    assert(logs.rows.some((v) => v.action === "INJECT"));
    assert(
      !JSON.stringify(await f.b.snapshot(id, f.aa)).includes(f.pb.credential),
    );
  } finally {
    await f.db.close();
  }
});
test("shared slot ownership, stale commands, operator authority and obsolete sessions are enforced across services", async () => {
  const f = await fixture();
  try {
    const id = f.r.sessionId;
    const team = cmd("TEAM", [1, 4, 7]);
    assert((await f.a.command(id, f.aa, team)).ok);
    assert.deepEqual(
      await f.b.command(id, f.aa, team),
      await f.a.command(id, f.aa, team),
    );
    assert(
      !(await f.b.command(id, f.aa, { ...cmd("READY"), seq: team.seq })).ok,
    );
    assert(!(await f.b.command(id, f.aa, cmd("START"))).ok);
    await f.b.attach(id, { bearer: f.pa.credential }, "new-tab");
    await assert.rejects(() => f.a.snapshot(id, f.aa, true), /another tab/);
    await f.a.detach(id, f.aa);
    assert(
      (
        await f.db.query("SELECT connection_id FROM gs_players WHERE id=$1", [
          f.pa.participantId,
        ])
      ).rows[0].connection_id === "new-tab",
    );
    assert((await f.b.command(id, f.op, cmd("RELEASE_SLOT", "A"))).ok);
    await assert.rejects(
      () => f.a.snapshot(id, { bearer: f.pa.credential }),
      /released/,
    );
    const replacement = await f.b.join(f.r.code, "A", profile("New A"));
    assert.notEqual(replacement.participantId, f.pa.participantId);
    const raw = (
      await f.db.query("SELECT state FROM gs_rooms WHERE id=$1", [id])
    ).rows[0].state;
    raw.scenarioVersion = "obsolete";
    await f.db.query("UPDATE gs_rooms SET state=$2::jsonb WHERE id=$1", [
      id,
      JSON.stringify(raw),
    ]);
    await assert.rejects(() => f.a.command(id, f.op, cmd("START")), /Archived/);
  } finally {
    await f.db.close();
  }
});
test("database elapsed catchup enforces 60-second emergency deadline and disconnect grace without a process timer", async () => {
  const f = await fixture();
  try {
    await start(f);
    const id = f.r.sessionId;
    const { preview } = await f.a.preview(id, f.op, {
      type: "INJECT",
      value: {
        kind: "emergency",
        eventKind: "blackout",
        target: "A",
        scope: "either",
        severity: 1,
        duration: 60,
        blocking: true,
      },
    });
    assert(
      (
        await f.b.command(
          id,
          f.op,
          cmd("CONFIRM_PREVIEW", null, { previewId: preview.id }),
        )
      ).ok,
    );
    await f.db.query(
      "UPDATE gs_rooms SET last_tick=last_tick-61000 WHERE id=$1",
      [id],
    );
    await f.db.query(
      "UPDATE gs_players SET lease_until=lease_until+120000 WHERE session_id=$1",
      [id],
    );
    const expired = await f.b.snapshot(id, f.op);
    assert.equal(expired.state.phase, "failed");
    assert(expired.state.emergencies.some((e) => e.status === "missed"));
  } finally {
    await f.db.close();
  }
  const g = await fixture();
  try {
    await start(g);
    await g.db.query(
      "UPDATE gs_players SET lease_until=0 WHERE session_id=$1",
      [g.r.sessionId],
    );
    await g.db.query(
      "UPDATE gs_rooms SET last_tick=last_tick-20000 WHERE id=$1",
      [g.r.sessionId],
    );
    const paused = await g.b.snapshot(g.r.sessionId, g.op);
    assert(paused.state.paused);
    assert.match(paused.net.pausedReason || "", /disconnected/);
  } finally {
    await g.db.close();
  }
});
test("SQLite import preserves identities, credentials and every legacy row without overwriting cloud sessions", async () => {
  const { Store } = await import("./database");
  const { importSqlite } = await import("./cloud/importSqlite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(".qa", { recursive: true });
  const path = ".qa/cloud-import-" + randomUUID() + ".sqlite",
    local = new Store(path);
  local.createOperator("legacy-operator", "legacy-password-123");
  const operator = local.db.prepare("SELECT * FROM operators").get() as any;
  const state = (await import("../src/engine")).initial();
  state.id = "import-" + randomUUID();
  state.code = "GS-IMPORT";
  local.db
    .prepare("INSERT INTO scenarios VALUES(?,?,?,?,?)")
    .run(
      "scenario",
      state.scenarioVersion,
      state.config.seed,
      JSON.stringify(state.config),
      Date.now(),
    );
  local.db
    .prepare(
      "INSERT INTO sessions(id,code,operator_id,scenario_id,source,phase,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)",
    )
    .run(
      state.id,
      state.code,
      operator.id,
      "scenario",
      "human",
      state.phase,
      Date.now(),
      Date.now(),
      Date.now() + 3600000,
    );
  local.saveSnapshot(state);
  local.activity(
    state,
    "legacy-example",
    "task",
    "TASK_FINISHED",
    "Legacy task finished",
  );
  local.close();
  const db = memoryPostgres();
  try {
    const first = await importSqlite(db, path);
    assert.equal(first.importedSessions, 1);
    assert(first.preservedRows > 3);
    const service = new CloudService(db);
    await service.ready;
    assert(
      (await service.login("legacy-operator", "legacy-password-123")).operator
        .id === operator.id,
    );
    await db.query(
      "UPDATE gs_rooms SET pause_reason='cloud edit' WHERE id=$1",
      [state.id],
    );
    const again = await importSqlite(db, path);
    assert.equal(again.importedSessions, 0);
    assert.equal(again.preservedRows, 0);
    assert.equal(
      (
        await db.query("SELECT pause_reason FROM gs_rooms WHERE id=$1", [
          state.id,
        ])
      ).rows[0].pause_reason,
      "cloud edit",
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*) AS n FROM gs_activity WHERE session_id=$1 AND entry_key='legacy-example'",
          [state.id],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});
test("Vercel rewrite targets preserve HTTP and WebSocket authentication routes", async () => {
  const app = createCloudApp({
    db: memoryPostgres(),
    bootstrapUser: "rewrite-test",
    bootstrapPassword: "rewrite-password",
  });
  let socket: WebSocket | undefined;
  try {
    await app.service.ready;
    const base = "http://127.0.0.1:" + (await app.listen(0, "127.0.0.1"));
    const health = await fetch(base + "/api/cloud?__route=/api/health");
    assert.equal((await health.json()).mode, "postgres-authoritative");
    const login = await app.service.login("rewrite-test", "rewrite-password"),
      room = await app.service.create(login.operator.id);
    socket = new WebSocket(
      base.replace("http:", "ws:") + "/api/cloud?__route=/ws",
      { headers: { Cookie: "jt_operator=" + login.token } },
    );
    const snapshot = await new Promise<any>((done, fail) => {
      const timeout = setTimeout(
        () => fail(Error("Rewrite socket did not authenticate")),
        10000,
      );
      socket!.on("error", fail);
      socket!.on("open", () =>
        socket!.send(
          JSON.stringify({
            type: "auth",
            protocol: PROTOCOL_VERSION,
            mapSignature: MAP_SIGNATURE,
            sessionId: room.sessionId,
            role: "control",
          }),
        ),
      );
      socket!.on("message", (data) => {
        const message = JSON.parse(data.toString());
        clearTimeout(timeout);
        if (message.type === "snapshot") done(message);
        else fail(Error(message.message || "No snapshot"));
      });
    });
    assert.equal(snapshot.state.id, room.sessionId);
    assert.equal(snapshot.net.role, "control");
  } finally {
    socket?.terminate();
    await app.close();
  }
});
test('cloud password reset preserves account/game records and revokes old logins without bootstrap overwrites',async()=>{
 const f=await fixture();try{const op=await f.a.operator(f.op),before=(await f.a.snapshot(f.r.sessionId,f.op)).state;
 assert.deepEqual(await f.a.checkOperatorEnvironment('operator','test-secret-12345'),{accountExists:true,passwordMatchesEnvironment:true});
 assert.deepEqual(await f.a.checkOperatorEnvironment('operator','new-password-12345'),{accountExists:true,passwordMatchesEnvironment:false});
 await f.a.createOperator('operator','new-password-12345');assert((await f.a.checkOperatorEnvironment('operator','test-secret-12345')).passwordMatchesEnvironment);
 await f.a.resetOperatorPassword('operator','new-password-12345');await assert.rejects(()=>f.b.operator(f.op),/login required/);await assert.rejects(()=>f.b.login('operator','test-secret-12345'),/Incorrect/);
 const login=await f.b.login('operator','new-password-12345');assert.equal(login.operator.id,op.id);const state=(await f.a.snapshot(f.r.sessionId,{cookie:login.token})).state;assert.equal(state.id,before.id);assert.equal(state.code,before.code);
 assert((await f.a.checkOperatorEnvironment('operator','new-password-12345')).passwordMatchesEnvironment);await assert.rejects(()=>f.a.resetOperatorPassword('missing','new-password-12345'),/not found/);
 }finally{await f.db.close();}
});
test('movement frames combine heartbeat, orientation and input with five SQL calls and retain shared authority',async()=>{
 const f=await fixture();try{await start(f);const id=f.r.sessionId;const baseDb=f.db;let queries=0;const counted={...baseDb,transaction:<T>(fn:(c:any)=>Promise<T>)=>baseDb.transaction(c=>fn({query:async(sql:string,values?:any[])=>{queries++;return c.query(sql,values);}}))};const fast=new CloudService(counted);await fast.ready;queries=0;
 const frame=await fast.motionFrame(id,f.aa,[cmd('LOOK',0),cmd('INPUT',{x:1,y:0})]);assert.equal(frame.acknowledgements.length,2);assert(frame.acknowledgements.every(v=>v.ok));assert.equal(frame.snapshot.net.lastCommandSeq,seq);assert(queries<=3,'Room lock, access and combined save should use three SQL calls, got '+queries);assert.equal((await f.b.snapshot(id,f.op)).state.players.A.input.x,1);
 const player=(await f.db.query('SELECT last_seq,lease_until FROM gs_players WHERE id=$1',[f.pa.participantId])).rows[0];assert.equal(Number(player.last_seq),seq);assert(Number(player.lease_until)>0);
 await assert.rejects(()=>fast.motionFrame(id,f.op,[cmd('INPUT',{x:1,y:0})]),/player slot/);await assert.rejects(()=>fast.motionFrame(id,f.aa,[cmd('FAIL')]),/Only movement/);await f.b.attach(id,{bearer:f.pa.credential},'replacement');await assert.rejects(()=>fast.motionFrame(id,f.aa,[]),/another tab/);
 }finally{await f.db.close();}
});
test('a blocked cloud action does not replay stale movement ahead of a newer stop',async()=>{
 const app=createCloudApp({db:memoryPostgres(),bootstrapPassword:'queue-test-password'});let socket:WebSocket|undefined,release!:()=>void;
 try{
  await app.service.ready;const login=await app.service.login('operator','queue-test-password'),room=await app.service.create(login.operator.id),player=await app.service.join(room.code,'A',profile('A'));
  const base='http://127.0.0.1:'+await app.listen(0,'127.0.0.1');socket=new WebSocket(base.replace('http:','ws:')+'/ws');
  await new Promise<void>((resolve,reject)=>{socket!.once('error',reject);socket!.on('message',data=>{if(JSON.parse(data.toString()).type==='snapshot')resolve();});socket!.once('open',()=>socket!.send(JSON.stringify({type:'auth',role:'A',credential:player.credential,sessionId:room.sessionId,protocol:PROTOCOL_VERSION,mapSignature:MAP_SIGNATURE})));});
  const originalCommand=app.service.command.bind(app.service),originalMotion=app.service.motionFrame.bind(app.service),batches:any[][]=[];
  let entered!:()=>void;const started=new Promise<void>(r=>entered=r),blocked=new Promise<void>(r=>release=r);
  app.service.command=async(...args)=>{entered();await blocked;return originalCommand(...args);};
  app.service.motionFrame=async(...args)=>{batches.push(args[2]);return originalMotion(...args);};
  socket.send(JSON.stringify({type:'command',command:cmd('QUICK_SIGNAL','Acknowledged')}));await started;
  socket.send(JSON.stringify({type:'command',command:cmd('INPUT',{x:1,y:0})}));await new Promise(r=>setTimeout(r,300));
  socket.send(JSON.stringify({type:'command',command:cmd('INPUT',{x:0,y:0})}));await new Promise(r=>setTimeout(r,30));release();
  const end=Date.now()+3000;while(!batches.some(b=>b.length)&&Date.now()<end)await new Promise(r=>setTimeout(r,20));
  const first=batches.find(b=>b.length)!;assert.ok(first);assert.deepEqual(first.find(c=>c.type==='INPUT')?.value,{x:0,y:0});
 }finally{release?.();socket?.terminate();await app.close();}
});
test('latest-only polling cannot overtake a queued consequential command',async()=>{
 const app=createCloudApp({db:memoryPostgres(),bootstrapPassword:'order-test-password'});let socket:WebSocket|undefined,release!:()=>void;
 try{await app.service.ready;const login=await app.service.login('operator','order-test-password'),room=await app.service.create(login.operator.id),p=await app.service.join(room.code,'A',profile('A')),base='http://127.0.0.1:'+await app.listen(0,'127.0.0.1');socket=new WebSocket(base.replace('http:','ws:')+'/ws');
 await new Promise<void>((done,fail)=>{socket!.once('error',fail);socket!.on('message',d=>{if(JSON.parse(d.toString()).type==='snapshot')done();});socket!.once('open',()=>socket!.send(JSON.stringify({type:'auth',role:'A',credential:p.credential,sessionId:room.sessionId,protocol:PROTOCOL_VERSION,mapSignature:MAP_SIGNATURE})));});
 const original=app.service.command.bind(app.service),motion=app.service.motionFrame.bind(app.service),trace:number[]=[];let entered!:()=>void;const started=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);let first=true;
 app.service.command=async(...args)=>{if(first){first=false;entered();await gate;}trace.push(args[2].seq);return original(...args);};app.service.motionFrame=async(...args)=>{trace.push(...args[2].map(c=>c.seq));return motion(...args);};
 const send=(c:ReturnType<typeof cmd>)=>socket!.send(JSON.stringify({type:'command',command:c}));send(cmd('QUICK_SIGNAL','Acknowledged'));await started;await new Promise(r=>setTimeout(r,250));
 const move=cmd('INPUT',{x:1,y:0}),action=cmd('QUICK_SIGNAL','Need help'),stop=cmd('INPUT',{x:0,y:0});send(move);send(action);send(stop);await new Promise(r=>setTimeout(r,30));release();
 const until=Date.now()+3000;while(!trace.includes(stop.seq)&&Date.now()<until)await new Promise(r=>setTimeout(r,20));assert.ok(trace.includes(stop.seq));assert.ok(trace.indexOf(move.seq)<trace.indexOf(action.seq));assert.ok(trace.indexOf(action.seq)<trace.indexOf(stop.seq),JSON.stringify(trace));
 }finally{release?.();socket?.terminate();await app.close();}
});
