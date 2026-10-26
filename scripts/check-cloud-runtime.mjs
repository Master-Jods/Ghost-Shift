import {execFileSync}from 'node:child_process';
import{mkdirSync,copyFileSync,readFileSync}from 'node:fs';
import{resolve}from 'node:path';
import{pathToFileURL}from 'node:url';
// Exercise emitted JavaScript with native Node ESM, without tsx/Vite resolving
// extensionless imports on our behalf. No private env file or cloud DB used.
const root=resolve('.qa/native-cloud-runtime');
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.server.json','--noEmit','false','--outDir',root,'--rootDir','.'],{stdio:'inherit',windowsHide:true});
mkdirSync(resolve(root,'public/catalog'),{recursive:true});
const files=['index.json','records.json','identities.json','pokemon-models.json','pokemon-assets.json'];
for(const name of files)copyFileSync(resolve('public/catalog',name),resolve(root,'public/catalog',name));
copyFileSync('server/cloud/schema.sql',resolve(root,'server/cloud/schema.sql'));
const config=JSON.parse(readFileSync('vercel.json','utf8'));
for(const name of files)if(!config.functions['api/cloud.ts'].includeFiles.includes('public/catalog/'+name))throw Error('Missing function asset inclusion: '+name);
const{createCloudApp}=await import(pathToFileURL(resolve(root,'server/cloud/app.js')).href);
const{PGlite}=await import('@electric-sql/pglite');const pg=new PGlite();
const client=p=>({async query(sql,values){if(!values?.length&&sql.includes(';'))return(await p.exec(sql)).at(-1)||{rows:[]};return p.query(sql,values);}});
const db={...client(pg),transaction:fn=>pg.transaction(tx=>fn(client(tx))),close:()=>pg.close()};
const app=createCloudApp({db,bootstrapUser:'native-smoke',bootstrapPassword:'isolated-test-password'});
try{await app.service.ready;const base='http://127.0.0.1:'+await app.listen(0,'127.0.0.1');const response=await fetch(base+'/api/cloud?__route=/api/health');const result=await response.json();if(response.status!==200||result.mode!=='postgres-authoritative'||result.setupRequired)throw Error('Native runtime health failed');const login=await fetch(base+'/api/operator/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'native-smoke',password:'isolated-test-password'})});if(login.status!==200||(await login.json()).operator?.username!=='native-smoke')throw Error('Native runtime operator login failed');console.log('PASS: emitted JavaScript imports, bundled catalog assets, schema migration, health route and operator login work in native Node ESM.');}finally{await app.close();}
