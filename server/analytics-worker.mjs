import {parentPort,workerData} from 'node:worker_threads';
import {tsImport} from 'tsx/esm/api';
const {forecastRuns,comparePlans,whatIf,evaluate}=await tsImport('./analytics.ts',import.meta.url);
const {quickForecast,quickPlans}=await tsImport('./quickAnalysis.ts',import.meta.url);
try{let result;const {kind,state,options={}}=workerData;if(kind==='forecast')result=quickForecast(state,options.n,options.seed,options.plan);else if(kind==='plans')result=quickPlans(state,options.n,options.seed);else if(kind==='whatif')result={...quickPlans({...structuredClone(state),config:{...state.config,...options.changes}},options.n),activeSessionUnchanged:true,changedAssumptions:options.changes};else if(kind==='evaluation')result=evaluate(options.count);else throw Error('Unknown analytics job.');parentPort.postMessage({ok:true,result});}catch(error){parentPort.postMessage({ok:false,error:error.message});}
