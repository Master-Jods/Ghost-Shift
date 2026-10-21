import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['--watch','--import','tsx','server/index.ts'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{stdio:'inherit'})];
const stop=()=>children.forEach(child=>child.kill());
process.on('SIGINT',stop);process.on('SIGTERM',stop);
children.forEach(child=>child.on('exit',code=>{if(code){stop();process.exitCode=code;}}));
