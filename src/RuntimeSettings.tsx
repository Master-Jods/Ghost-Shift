import {useEffect,useState} from 'react';
import {RefreshCw,Wifi} from 'lucide-react';
import {network} from './transport';

export function RuntimeSettings(){
 const [runtime,setRuntime]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){setBusy(true);try{setRuntime(await network!.api('/api/operator/runtime'));setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{void refresh();},[]);
 return <section className="panel"><div className="panel-head"><h3><Wifi size={15}/>Live server configuration</h3><button className="text-button" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={13}/>Check server</button></div>{error&&<p className="net-error" role="alert">{error}</p>}{runtime?<dl><div><dt>Connected origin</dt><dd>{location.origin}</dd></div><div><dt>Protocol / scenario</dt><dd>{runtime.protocol} / {runtime.scenarioVersion}</dd></div><div><dt>Disconnect grace period</dt><dd>{runtime.disconnectGraceMs/1000} seconds</dd></div><div><dt>Room lifetime</dt><dd>{runtime.sessionTtlMs/3600000} hours</dd></div><div><dt>Simulation / snapshots</dt><dd>{runtime.simulationHz} / {runtime.snapshotHz} Hz</dd></div><div><dt>Forecast method version</dt><dd>{runtime.modelVersion}</dd></div></dl>:!error&&<p>Reading the running server configuration…</p>}</section>;
}
