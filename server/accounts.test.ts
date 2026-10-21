import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from './database';

test('operator setup accepts ten characters and repeated creation preserves credentials and login sessions',()=>{
 const store=new Store(':memory:');
 try{
  assert.throws(()=>store.createOperator('operator','123456789'),/at least 10/);
  assert.equal(store.createOperator('operator','fixture123'),true);
  const login=store.login('operator','fixture123');assert.ok(login);
  assert.equal(store.createOperator('operator','another123'),false);
  assert.ok(store.login('operator','fixture123'));
  assert.equal(store.login('operator','another123'),null);
  assert.equal(store.operatorByToken(login.token)?.username,'operator');
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM operators').get()?.n,1);
 }finally{store.close();}
});
