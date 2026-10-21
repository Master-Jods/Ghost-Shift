import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app';
import { RULES } from '../src/rules';
import {WebSocket} from 'ws';
import {MAP_SIGNATURE} from '../src/world';
import {PROTOCOL_VERSION} from '../src/protocol';

test('socket authenticates only matching geometry and missing build assets return 404',async()=>{
 const app=createApp({dbPath:':memory:',staticDir:'dist'}),port=await app.listen(0,'127.0.0.1'),base=`http://127.0.0.1:${port}`,room=app.createRoom(null),join=app.joinRoom(room,'A','Map fixture');
 const sockets:WebSocket[]=[];
 const auth=async(mapSignature?:string,protocol=PROTOCOL_VERSION)=>{const ws=new WebSocket(base.replace('http','ws')+'/ws');sockets.push(ws);await new Promise<void>(resolve=>ws.once('open',resolve));const reply=new Promise<any>((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Missing auth reply')),2000);ws.once('message',data=>{clearTimeout(timeout);resolve(JSON.parse(data.toString()));});});ws.send(JSON.stringify({type:'auth',protocol,mapSignature,role:'A',sessionId:room.state.id,credential:join.credential}));return reply;};
 try{
  const health=await(await fetch(base+'/api/health')).json();assert.equal(health.mapSignature,MAP_SIGNATURE);
  for(const signature of [undefined,'aster-wings-v3:stale']){const result=await auth(signature);assert.equal(result.type,'error');assert.match(result.message,/Map version mismatch/);assert.equal(room.peers.size,0);}
  const oldProtocol=await auth(MAP_SIGNATURE,PROTOCOL_VERSION-1);assert.equal(oldProtocol.type,'error');assert.match(oldProtocol.message,/protocol mismatch/);assert.equal(room.peers.size,0);
  const snapshot=await auth(MAP_SIGNATURE);assert.equal(snapshot.type,'snapshot');assert.equal(snapshot.net.mapSignature,MAP_SIGNATURE);assert.equal(snapshot.protocol,PROTOCOL_VERSION);assert.equal(room.peers.size,1);
  const missing=await fetch(base+'/assets/old-build-deadbeef.js');assert.equal(missing.status,404);assert.doesNotMatch(missing.headers.get('content-type')||'',/text\/html/);
 }finally{for(const ws of sockets)ws.terminate();await app.close();}
});
test('incompatible geometry archives old sessions without replacing snapshots or operator credentials', async () => {
    mkdirSync('.qa', { recursive: true });
    const dir = mkdtempSync(resolve('.qa', 'map-version-')), dbPath = resolve(dir, 'test.sqlite');
    let app = createApp({ dbPath, bootstrapUser: 'map-fixture', bootstrapPassword: 'fixture-password-123' });
    try {
        const old = app.createRoom(null);
        old.state.scenarioVersion = 'ghost-shift-v1';
        app.store.saveSnapshot(old.state);
        const before = JSON.stringify(old.state);
        const current = app.createRoom(null);
        const oldId = old.state.id, currentId = current.state.id;
        await app.close();
        app = createApp({ dbPath });
        const login=app.store.login('map-fixture', 'fixture-password-123');assert.ok(login);
        const port=await app.listen(0,'127.0.0.1');const response=await fetch(`http://127.0.0.1:${port}/api/sessions/${oldId}/jobs`,{method:'POST',headers:{Cookie:'jt_operator='+login.token,'Content-Type':'application/json'},body:JSON.stringify({kind:'forecast'})});assert.equal(response.status,409);assert.match((await response.json()).error,/Archived map version/);
        assert.equal(app.rooms.get(oldId)?.closed, true);
        assert.equal(app.rooms.get(currentId)?.state.scenarioVersion, RULES.scenario.version);
        const row = app.store.db.prepare('SELECT closed FROM sessions WHERE id=?').get(oldId) as {
            closed: number;
        };
        assert.equal(row.closed, 1);
        const snap = app.store.db.prepare('SELECT state_json FROM session_snapshots WHERE session_id=?').get(oldId) as {
            state_json: string;
        };
        assert.equal(snap.state_json, before);
    }
    finally {
        await app.close();
        rmSync(dir, { recursive: true, force: true });
    }
});
