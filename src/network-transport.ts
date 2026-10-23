import {MAP_SIGNATURE} from './world';
import {RULES} from './rules';
import {commandId} from './ids';
import {initial,type State,type Action} from './engine';
import {PROTOCOL_VERSION,needsPreview,type NetInfo,type DecisionPreview,type Proposal,type Command} from './protocol';
type Credential={sessionId:string;code:string;role:'A'|'B';participantId:string;credential:string;nextSeq:number;protocol:number};
const emptyNet:NetInfo={mode:'server',protocol:PROTOCOL_VERSION,role:null,sessionId:null,connected:false,authenticated:false,presence:{A:{connected:false,alias:'Trainer A',lastSeen:null},B:{connected:false,alias:'Trainer B',lastSeen:null}},proposal:null,error:'',pausedReason:null};
export type DecisionView={loading:boolean;preview:DecisionPreview|null;proposal:Proposal|null;error:string}|null;
export class NetworkTransport{
 readonly mode='server' as const;private state:State={...initial(),code:'',connection:'Connecting',threats:[]};private net:NetInfo={...emptyNet};private listeners=new Set<()=>void>();private socket:WebSocket|null=null;private credential:Credential|null=null;private pending=new Map<string,Command>();private movementCommands=new Set<string>();private seq=1;private reconnects=0;private stop=false;private timeout?:ReturnType<typeof setTimeout>;private decision:DecisionView=null;private previewTicket=0;private firstResolve?:()=>void;private socketRole:'control'|'A'|'B'|null=null;
 constructor(){const code=new URLSearchParams(location.search).get('code');if(code)this.state={...this.state,code};const saved=sessionStorage.getItem('jt-active-player');if(saved&&!location.pathname.startsWith('/operator')){try{this.credential=JSON.parse(saved);this.seq=this.credential!.nextSeq;this.connect(this.credential!.sessionId,this.credential!.role);}catch{}}}
 getSnapshot=()=>this.state;
 getNetSnapshot=()=>this.net;
 getDecisionSnapshot=()=>this.decision;
 subscribe=(cb:()=>void)=>{this.listeners.add(cb);return()=>{this.listeners.delete(cb);};};
 private emit(){this.listeners.forEach(fn=>fn());}
 private error(message:string){this.net={...this.net,error:message};this.emit();}
 clearError=()=>{this.net={...this.net,error:''};this.emit();};
 async api(path:string,options:RequestInit={}){const headers=new Headers(options.headers);if(options.body)headers.set('Content-Type','application/json');if(this.credential&&!this.socketRole?.startsWith('control'))headers.set('Authorization','Bearer '+this.credential.credential);const response=await fetch(path,{...options,credentials:'include',headers,cache:'no-store'});let data:any;try{data=await response.json();}catch{throw Error('Server response was unavailable. Check the host connection.');}if(!response.ok)throw Error(data.error||`Server request failed (${response.status}).`);return data;}
 private async recoverBuild(){
  const key='gs-map-reload-'+MAP_SIGNATURE;
  if(sessionStorage.getItem(key)){this.error('Client/server map versions differ. The host server must run the current build; movement is disabled. Reconnect after the host updates.');return;}
  sessionStorage.setItem(key,'1');
  try{await navigator.serviceWorker?.getRegistration().then(r=>r?.update());if('caches' in window)for(const name of await caches.keys())if(name.startsWith('ghost-shift-')||name.startsWith('jigsaw-shell-'))await caches.delete(name);}catch{/* Network shell reload still works. */}
  location.reload();
 }
 private async accept(value:Credential){this.previewTicket++;this.pending.clear();this.decision=null;this.credential=value;this.seq=Math.max(value.nextSeq,Number(sessionStorage.getItem('jt-seq-'+value.participantId)||1));sessionStorage.setItem('jt-player-'+value.code+'-'+value.role,JSON.stringify(value));sessionStorage.setItem('jt-active-player',JSON.stringify(value));this.state={...initial(),id:value.sessionId,code:value.code,connection:'Connecting',threats:[]};return new Promise<void>((resolve,reject)=>{this.firstResolve=resolve;this.connect(value.sessionId,value.role);setTimeout(()=>{if(!this.net.connected)reject(Error('Could not open the player socket. Use reconnect after checking the server.'));},7000);});}
 async join(role:'A'|'B',code:string){const saved=sessionStorage.getItem('jt-player-'+code.toUpperCase()+'-'+role);const old=saved?JSON.parse(saved):null;const data=await this.api('/api/join',{method:'POST',body:JSON.stringify({code:code.toUpperCase(),role,alias:'Trainer '+role,resumeToken:old?.credential})});await this.accept(data);}
 async operatorConnect(id:string){this.previewTicket++;this.pending.clear();this.decision=null;this.credential=null;this.socketRole='control';sessionStorage.setItem('jt-operator-session',id);return new Promise<void>((resolve,reject)=>{this.firstResolve=resolve;this.connect(id,'control');setTimeout(()=>{if(!this.net.connected)reject(Error('Operator socket did not connect.'));},7000);});}
 private connect(id:string,role:'control'|'A'|'B'){
  this.stop=false;clearTimeout(this.timeout);if(this.socket){this.socket.onclose=null;this.socket.close();}this.socketRole=role;const previous=this.net.connected;this.net={...this.net,sessionId:id,role,connected:false};this.state={...this.state,connection:this.reconnects?'Reconnecting':'Connecting'};this.emit();const socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);this.socket=socket;
  socket.onopen=()=>socket.send(JSON.stringify({type:'auth',mapSignature:MAP_SIGNATURE,protocol:PROTOCOL_VERSION,sessionId:id,role,credential:role!=='control'?this.credential?.credential:undefined}));
  socket.onmessage=e=>{let message:any;try{message=JSON.parse(e.data);}catch{return;}if(message.type==='snapshot'){
    if(message.protocol!==PROTOCOL_VERSION||message.net?.mapSignature!==MAP_SIGNATURE||message.state?.scenarioVersion!==RULES.scenario.version){this.stop=true;this.net={...this.net,connected:false};this.error('Client/server map mismatch. Movement stopped while checking the current build.');void this.recoverBuild();socket.close();return;}
    const authenticatedBefore=this.net.connected;this.state={...message.state,connection:this.reconnects?'Session restored':'Connected'};this.net={...message.net,error:(['success','failed'].includes(this.state.phase)||(role!=='control'&&this.state.players[role].exit))&&this.net.error.startsWith('Action rejected.')?'':this.net.error};this.reconnects=0;this.firstResolve?.();this.firstResolve=undefined;
    if(!authenticatedBefore)for(const cmd of this.pending.values())socket.send(JSON.stringify({type:'command',command:cmd}));
    const proposal=this.net.proposal;if(this.decision?.proposal&&proposal?.id===this.decision.proposal.id)this.decision={...this.decision,proposal,error:proposal.status==='pending'?this.decision.error:`Proposal ${proposal.status}. ${proposal.reason||'No further approval can execute.'}`};if(proposal?.status==='pending'&&proposal.by!==role&&role!=='control'&&this.decision?.proposal?.id!==proposal.id&&!sessionStorage.getItem('jt-reviewed-'+proposal.id))this.decision={loading:false,preview:proposal.preview,proposal,error:''};
    this.emit();
   }else if(message.type==='ack'){const waiter=this.waiters.get(message.id);if(waiter){this.waiters.delete(message.id);if(message.ok)waiter.resolve(message);else waiter.reject(Error(message.message));}const sent=this.pending.get(message.id),movement=this.movementCommands.delete(message.id);this.pending.delete(message.id);if(movement&&!message.ok&&(['success','failed'].includes(this.state.phase)||(this.socketRole!=='control'&&this.socketRole&&this.state.players[this.socketRole].exit)))return;if(!message.ok){this.error(message.message);if(this.decision)this.decision={...this.decision,error:message.message};}else{if(sent)this.net={...this.net,error:''};if(sent&&['CONFIRM_PREVIEW','PROPOSAL_APPROVE','PROPOSAL_REJECT','PROPOSAL_CANCEL'].includes(sent.type))this.decision=null;this.emit();}}
   else if(message.type==='ownership_lost'){this.stop=true;this.state={...this.state,connection:'Connection failed'};this.error(message.message);}
   else if(message.type==='error'){this.error(message.message);if(/protocol|version mismatch/i.test(message.message||'')){this.stop=true;this.net={...this.net,connected:false};void this.recoverBuild();}}
  };
  socket.onclose=()=>{if(this.stop)return;this.net={...this.net,connected:false};this.state={...this.state,connection:this.reconnects>=7?'Connection failed':'Reconnecting'};this.emit();if(this.reconnects<8)this.timeout=setTimeout(()=>{this.reconnects++;this.connect(id,role);},Math.min(8000,1000*2**this.reconnects));};
  socket.onerror=()=>{this.net={...this.net,error:'Connection interrupted. Reconnecting with the same slot credential.'};this.emit();};
 }
 private execute(type:string,value?:unknown,extra:Partial<Command>={}){if(!this.net.connected||!this.socket||this.socket.readyState!==WebSocket.OPEN){if(type!=='INPUT')this.error('Reconnect before sending this action.');return;}const command:Command={id:commandId(),seq:this.seq++,type,value,...extra};if(this.credential){this.credential.nextSeq=this.seq;sessionStorage.setItem('jt-seq-'+this.credential.participantId,String(this.seq));sessionStorage.setItem('jt-active-player',JSON.stringify(this.credential));}if(!['INPUT','LOOK'].includes(type))this.pending.set(command.id,command);else {this.movementCommands.add(command.id);if(this.movementCommands.size>128)this.movementCommands.delete(this.movementCommands.values().next().value!);}this.socket.send(JSON.stringify({type:'command',command}));}
 dispatch=(a:Action)=>{
  if(needsPreview(a.type,a.value)){void this.requestPreview(a.type,a.value);return;}
  if(a.type==='APPROVE'){this.reviewProposal();return;}
  if(a.type==='REJECT'){this.execute('PROPOSAL_REJECT',undefined,{proposalId:this.net.proposal?.id});return;}
  if(a.type==='SIMULATED'||a.type==='JOIN')return;
  if(a.type==='CONNECTION'){this.error('Network state is detected from real sockets. Use reconnect; simulated status controls exist only in local mode.');return;}
  if(a.type==='RECONNECT'){this.reconnect();return;}
  if(a.type==='RESET'){void this.rematch(a.value).catch(e=>this.error(e.message));return;}
  this.execute(a.type,a.value);
 };
 ready=(role:'A'|'B')=>this.dispatch({type:'READY',role});
 private waiters=new Map<string,{resolve:(ack:any)=>void;reject:(e:Error)=>void}>();
 async command(type:string,value?:unknown){
  if(!this.net.sessionId||!this.net.connected)throw Error('Reconnect to the session before sending this command.');
  return new Promise<any>((resolve,reject)=>{const command:Command={id:commandId(),seq:this.seq++,type,value};if(this.credential){this.credential.nextSeq=this.seq;sessionStorage.setItem('jt-active-player',JSON.stringify(this.credential));}this.pending.set(command.id,command);this.waiters.set(command.id,{resolve,reject});this.socket!.send(JSON.stringify({type:'command',command}));setTimeout(()=>{if(this.waiters.delete(command.id))reject(Error('Command acknowledgement timed out. Reconnect to inspect the authoritative state.'));},10000);});
 }
 reconnect=()=>{this.reconnects=0;this.stop=false;if(this.net.sessionId&&this.socketRole)this.connect(this.net.sessionId,this.socketRole);};
 async requestPreview(type:string,value?:unknown){if(!this.net.sessionId||(this.socketRole==='control'&&type!=='INJECT')){this.error('Join a player slot before making a gameplay decision.');return;}const ticket=++this.previewTicket,sessionId=this.net.sessionId;if(this.socketRole!=='control')this.execute('INPUT',{x:0,y:0});this.decision={loading:true,preview:null,proposal:null,error:''};this.emit();try{const data=await this.api(`/api/sessions/${this.net.sessionId}/preview`,{method:'POST',body:JSON.stringify({type,value})});if(ticket!==this.previewTicket){void this.api(`/api/sessions/${sessionId}/preview/cancel`,{method:'POST',body:JSON.stringify({previewId:data.preview.id})}).catch(()=>{});return;}this.decision={loading:false,preview:data.preview,proposal:null,error:''};}catch(e){if(ticket!==this.previewTicket)return;this.decision={loading:false,preview:null,proposal:null,error:(e as Error).message};}this.emit();}
 confirmDecision=()=>{if(this.decision?.proposal)this.execute('PROPOSAL_APPROVE',undefined,{proposalId:this.decision.proposal.id});else if(this.decision?.preview)this.execute('CONFIRM_PREVIEW',undefined,{previewId:this.decision.preview.id});};
 cancelDecision=()=>{this.previewTicket++;if(this.decision?.preview&&!this.decision.proposal&&this.net.sessionId)void this.api(`/api/sessions/${this.net.sessionId}/preview/cancel`,{method:'POST',body:JSON.stringify({previewId:this.decision.preview.id})}).catch(()=>{});if(this.decision?.proposal)sessionStorage.setItem('jt-reviewed-'+this.decision.proposal.id,'true');this.decision=null;this.emit();};
 rejectProposal=()=>{if(this.decision?.proposal)this.execute('PROPOSAL_REJECT',undefined,{proposalId:this.decision.proposal.id});};
 cancelProposal=()=>this.execute('PROPOSAL_CANCEL',undefined,{proposalId:this.net.proposal?.id});
 reviewProposal=()=>{if(this.net.proposal){this.decision={loading:false,preview:this.net.proposal.preview,proposal:this.net.proposal,error:''};this.emit();}};
 async rematch(config?:unknown){if(this.socketRole!=='control'||!this.net.sessionId)throw Error('Select an operator session before creating a rematch.');const value=await this.api(`/api/sessions/${this.net.sessionId}/rematch`,{method:'POST',body:JSON.stringify({config})});await this.operatorConnect(value.sessionId);return value;}
 async finalizeTeam(ids:number[]){if(!this.net.sessionId)throw Error('Join a session first.');const seq=this.seq++;if(this.credential){this.credential.nextSeq=this.seq;sessionStorage.setItem('jt-active-player',JSON.stringify(this.credential));sessionStorage.setItem('jt-seq-'+this.credential.participantId,String(this.seq));}const result=await this.api(`/api/sessions/${this.net.sessionId}/team`,{method:'POST',body:JSON.stringify({ids,seq})});if(!result.ok)throw Error(result.message);return result;}
 async createSession(config?:unknown){this.socketRole='control';const value=await this.api('/api/sessions',{method:'POST',body:JSON.stringify({config})});await this.operatorConnect(value.sessionId);return value;}
 destroy(){this.stop=true;clearTimeout(this.timeout);this.socket?.close();}
}
