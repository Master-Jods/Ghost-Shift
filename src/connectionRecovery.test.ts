import {test} from 'node:test';import assert from 'node:assert/strict';
import {connectionRecovery} from './connectionRecovery';
test('scheduled server rotation recovers promptly, transient failures keep retrying with bounded delay',()=>{assert.deepEqual(connectionRecovery(1012,0),{retry:true,delay:100});assert.equal(connectionRecovery(1006,0).delay,500);assert.equal(connectionRecovery(1006,100).delay,8000);assert.equal(connectionRecovery(1006,100).retry,true);assert.equal(connectionRecovery(1000,0).retry,true);});
test('revoked credentials, slot takeover and policy failure do not reconnect forever',()=>{for(const code of [1008,4001,4003,4008])assert.equal(connectionRecovery(code,0).retry,false);});
