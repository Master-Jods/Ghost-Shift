import {createApp} from './app';
const app=createApp({tlsKey:process.env.TLS_KEY,tlsCert:process.env.TLS_CERT,bootstrapUser:process.env.OPERATOR_USER,bootstrapPassword:process.env.OPERATOR_PASSWORD});
const port=await app.listen();console.log(`Ghost Shift authoritative server listening on ${process.env.HOST||'0.0.0.0'}:${port}. Protocol v4. Database: ${process.env.DB_PATH||'data/jigsaw.sqlite'}`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,async()=>{await app.close();process.exit(0);});
