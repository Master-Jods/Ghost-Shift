import {Store,hashPassword} from './database';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {evaluate,MODEL_VERSION} from './analytics';
import {randomUUID} from 'node:crypto';
const store=new Store(process.env.DB_PATH||'data/jigsaw.sqlite'),command=process.argv[2];
try{
 if(command==='operator'){if(!process.env.OPERATOR_PASSWORD)throw Error('Set OPERATOR_PASSWORD in your private .env (at least 10 characters). Then run npm run operator:create. No default password exists.');const created=store.createOperator(process.env.OPERATOR_USER||'operator',process.env.OPERATOR_PASSWORD);console.log(created?'Operator account created. Password was hashed with scrypt and was not printed.':'Operator account already exists. Existing password preserved. Use npm run operator:reset-password to change it.');}
 else if(command==='operator-reset'){const username=process.env.OPERATOR_USER||'operator',password=process.env.OPERATOR_PASSWORD;if(!password||password.length<10)throw Error('Set a new OPERATOR_PASSWORD of at least 10 characters in your private .env.');const op=store.db.prepare('SELECT id FROM operators WHERE username=?').get(username) as any;if(!op)throw Error('Operator does not exist. Use operator:create first.');store.transaction(()=>{store.db.prepare('UPDATE operators SET password_hash=? WHERE id=?').run(hashPassword(password),op.id);store.db.prepare('DELETE FROM operator_sessions WHERE operator_id=?').run(op.id);});console.log('Operator password updated; existing operator logins were revoked.');}
 else if(command==='backup'){mkdirSync('backups',{recursive:true});const path=resolve('backups',`ghost-shift-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);store.db.exec(`VACUUM INTO '${path.replaceAll("'","''")}'`);console.log(`Consistent database backup saved: ${path}`);}
 else if(command==='evaluate'){console.log('Computing held-out rule-based rollout evaluation…');const report=evaluate(Number(process.env.EVALUATION_SEEDS)||24);mkdirSync('reports',{recursive:true});writeFileSync('reports/evaluation.json',JSON.stringify(report,null,2));store.db.prepare('INSERT INTO analytical_versions VALUES(?,?,?,?,?)').run(randomUUID(),MODEL_VERSION,JSON.stringify(report.heldOut),JSON.stringify(report),Date.now());console.log(JSON.stringify({...report,rows:undefined},null,2));}
 else if(command==='migrate')console.log('SQLite migrations applied.');
 else throw Error('Use operator, backup, evaluate, or migrate.');
}finally{store.close();}
