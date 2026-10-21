import {parentPort,workerData} from 'node:worker_threads';
import {tsImport} from 'tsx/esm/api';
const {forecastRuns,comparePlans,whatIf,evaluate}=await tsImport('./analytics.ts',import.meta.url);
try{let result;const {kind,state,options={}}=workerData;if(kind==='forecast')result=forecastRuns(state,options.n,options.seed,options.plan,options.tactic);else if(kind==='plans')result=comparePlans(state,options.n,options.seed);else if(kind==='whatif')result=whatIf(state,options.changes,options.n);else if(kind==='evaluation')result=evaluate(options.count);else throw Error('Unknown analytics job.');parentPort.postMessage({ok:true,result});}catch(error){parentPort.postMessage({ok:false,error:error.message});}
