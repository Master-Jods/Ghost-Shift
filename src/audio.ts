import {dangerSamples, type DangerKind} from './dangerSound';
import {BATTLE_SAMPLES,battleSound,type BattleSample}from './battleAudio';
import type { CueKind, PresentationSettings } from './presentation';
import type { Vec } from './world';
/** One bounded mixer: original music/UI, recorded CC0 battle foley and credited Pokemon cries. */
export class FacilityAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private effects: GainNode | null = null;
    private ambience: GainNode | null = null;
    private music: GainNode | null = null;private analyser:AnalyserNode|null=null;private musicTimer:ReturnType<typeof setInterval>|null=null;private nextBeat=0;private beat=0;private active=true;private mode:'menu'|'explore'|'danger'|'battle'|'off'='menu';private notes=0;private clicks=0;private typingCount=0;private battleCount=0;private playedCries=0;private lastTyping=-Infinity;
    setMusicMode(mode:typeof this.mode){this.mode=mode;}
    get diagnostics(){let level=0;if(this.analyser){const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);level=Math.sqrt(a.reduce((n,v)=>n+v*v,0)/a.length);}return {footstepsPlayed:this.footstepsPlayed,decodedFootsteps:this.footsteps.size,dangerAlarms:this.dangerCount,dangerKind:this.dangerKind,dangerActive:!!this.dangerNodes,dangerIncident:this.dangerId,ready:this.ready,mode:this.mode,notes:this.notes,clicks:this.clicks,typing:this.typingCount,battleEffects:this.battleCount,battleSamplesPlayed:this.battleSamplesPlayed,decodedBattleSamples:this.battleSamples.size,battleVolume:this.settings?.battleVolume??.7,cries:this.playedCries,decodedCries:this.cryBuffers.size,musicGain:this.music?.gain.value||0,level,muted:this.settings?.muted??true,musicVolume:this.settings?.music??0};}
    async ui(kind:'click'|'change',settings:PresentationSettings){await this.unlock(settings);this.clicks++;this.play(kind==='click'?'selection':'switch',{x:0,y:0},{x:0,y:0},0);}
    typing(){const c=this.context;if(!c||!this.ready||this.settings?.muted||!this.active||c.currentTime-this.lastTyping<.025)return;this.lastTyping=c.currentTime;this.typingCount++;this.play('submitted',{x:0,y:0},{x:0,y:0},0,'typing');}
    private dangerNodes:{source:AudioBufferSourceNode;gain:GainNode}|null=null;
    private dangerBuffers=new Map<DangerKind,AudioBuffer>();
    private dangerCount=0;private dangerKind:'emergency'|'pokemon'|null=null;private dangerId:string|null=null;
    danger(kind:'emergency'|'pokemon',incidentId:string){
        const c=this.context,s=this.settings;
        if(!c||!this.ready||!this.active||!this.effects||!s||s.muted||s.master<=0||s.effects<=0)return false;
        if(this.dangerNodes&&this.dangerId===incidentId)return true;
        this.stopDanger();
        const buffer=this.dangerBuffers.get(kind);if(!buffer)return false;
        const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;
        gain.gain.value=.7;source.connect(gain).connect(this.effects);
        const nodes={source,gain};this.dangerNodes=nodes;this.dangerId=incidentId;this.dangerKind=kind;this.dangerCount++;
        source.onended=()=>{source.disconnect();gain.disconnect();if(this.dangerNodes===nodes){this.dangerNodes=null;this.dangerId=null;}};
        source.start();
        return true;
    }
    stopDanger(){const nodes=this.dangerNodes;if(!nodes)return;this.dangerNodes=null;this.dangerId=null;try{nodes.source.stop();}catch{}nodes.gain.gain.value=0;}
    reconcileDanger(active:Set<string>,allowed:boolean){if(!allowed||this.dangerId&&!active.has(this.dangerId))this.stopDanger();}
    private footsteps=new Map<string,AudioBuffer>();private footstepsLoading=false;private footstepsPlayed=0;private stepIndex=0;private footVoices=new Set<AudioBufferSourceNode>();
    private preloadFootsteps(){const c=this.context;if(!c||this.footstepsLoading)return;this.footstepsLoading=true;
        for(const surface of ['concrete','carpet'])for(let i=0;i<5;i++){const key=surface+'_'+String(i).padStart(3,'0');void fetch('/audio/footsteps/footstep_'+key+'.ogg',{signal:AbortSignal.timeout(6000)}).then(r=>{if(!r.ok)throw Error('Footstep unavailable');return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)).then(buffer=>{if(this.context===c)this.footsteps.set(key,buffer);}).catch(()=>{});}
    }
    private footstep(position:Vec,listener:Vec,yaw:number,surface:string){const c=this.context,s=this.settings;if(!c||!this.effects||!s||s.muted||!this.active||this.footVoices.size>=3)return;
        const material=surface==='rubber'?'carpet':'concrete',index=this.stepIndex++%5,buffer=this.footsteps.get(material+'_'+String(index).padStart(3,'0'));if(!buffer)return;
        const d=Math.hypot(position.x-listener.x,position.y-listener.y);if(d>400)return;
        const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=buffer;source.playbackRate.value=[.97,1.02,.99,1.04,1][index];filter.type='lowpass';filter.frequency.value=surface==='rubber'?1800:3500;gain.gain.value=.55/(1+d/120);pan.pan.value=Math.sin(Math.atan2(position.y-listener.y,position.x-listener.x)-yaw)*Math.min(.65,d/150);source.connect(filter).connect(pan).connect(gain).connect(this.effects);this.footVoices.add(source);this.footstepsPlayed++;source.onended=()=>{source.disconnect();filter.disconnect();pan.disconnect();gain.disconnect();this.footVoices.delete(source);};source.start();
    }
    private battleSamples=new Map<BattleSample,AudioBuffer>();private sampleLoading=false;private sampleReady:Promise<unknown>=Promise.resolve();private battleVoices=new Set<AudioBufferSourceNode>();private battleSamplesPlayed=0;
    private preloadBattle(){const c=this.context;if(!c||this.sampleLoading)return;this.sampleLoading=true;this.sampleReady=Promise.allSettled(BATTLE_SAMPLES.map(name=>fetch('/audio/battle/'+name+'.ogg',{signal:AbortSignal.timeout(6000)}).then(r=>{if(!r.ok)throw Error('Battle sample unavailable');return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)).then(buffer=>{if(this.context===c)this.battleSamples.set(name,buffer);}).catch(()=>{})));}
    async previewBattle(kind:string){if(this.settings)await this.unlock(this.settings);await this.sampleReady;this.battle(kind,kind==='attack'?'fire':'normal','player');}
    battle(kind:string,type:string,side:string){const c=this.context;if(!c||!this.ready||this.settings?.muted||(this.settings?.battleVolume??.7)<=0||!this.active||!this.effects||this.battleVoices.size>=4)return;const spec=battleSound(kind,type),buffer=this.battleSamples.get(spec.sample);if(!buffer)return;const source=c.createBufferSource(),filter=c.createBiquadFilter(),pan=c.createStereoPanner(),gain=c.createGain(),at=c.currentTime,duration=Math.min(spec.maxDuration,buffer.duration/spec.rate);source.buffer=buffer;source.playbackRate.value=spec.rate;filter.type='lowpass';filter.frequency.value=spec.cutoff;pan.pan.value=side==='player'?-.2:.2;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(spec.gain*(this.settings?.battleVolume??.7),at+.008);gain.gain.setValueAtTime(spec.gain*(this.settings?.battleVolume??.7),at+Math.max(.01,duration-.04));gain.gain.linearRampToValueAtTime(0,at+duration);source.connect(filter).connect(pan).connect(gain).connect(this.effects);this.battleVoices.add(source);source.onended=()=>{this.battleVoices.delete(source);source.disconnect();filter.disconnect();pan.disconnect();gain.disconnect();};source.start();source.stop(at+duration+.01);this.battleCount++;this.battleSamplesPlayed++;}
    private cryBuffers=new Map<number,AudioBuffer>();private cryPending=new Set<number>();private cryFailed=new Set<number>();private cryActive=new Set<AudioBufferSourceNode>();
    preloadCry(name:number){if(!Number.isInteger(name)||name<1||this.cryFailed.has(name)||this.cryBuffers.has(name)||this.cryPending.has(name)||!this.context)return;this.cryPending.add(name);const ctx=this.context;void fetch([1,4,6,7,25,133,197,609,10001,10117].includes(name)?'/audio/cries/'+name+'.ogg':'https://raw.githubusercontent.com/PokeAPI/cries/b3a9044bb839b5e3152aaa536c7b463a0fcf0140/cries/pokemon/latest/'+name+'.ogg',{signal:AbortSignal.timeout(6000)}).then(r=>{if(!r.ok)throw Error('Cry unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).then(buffer=>{if(ctx!==this.context)return;if(this.cryBuffers.size>=16)this.cryBuffers.delete(this.cryBuffers.keys().next().value!);this.cryBuffers.set(name,buffer);}).catch(()=>{this.cryFailed.add(name);}).finally(()=>this.cryPending.delete(name));}
    cry(name:number){const c=this.context,buffer=this.cryBuffers.get(name);if(!c||!buffer||!this.effects||!this.ready||this.settings?.muted||!this.active||(this.settings?.battleVolume??.7)<=0||this.cryActive.size>=1)return false;const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.value=.2*(this.settings?.battleVolume??.7);source.connect(gain).connect(this.effects);this.cryActive.add(source);this.playedCries++;source.onended=()=>{this.cryActive.delete(source);source.disconnect();gain.disconnect();};source.start();return true;}
    private score(){const c=this.context;if(!c||c.state!=='running')return;if(!this.active||this.settings?.muted||this.mode==='off'){this.nextBeat=c.currentTime+.06;return;}if(this.nextBeat<c.currentTime)this.nextBeat=c.currentTime+.03;const urgent=this.mode==='danger'||this.mode==='battle',step=urgent?.26:.42;while(this.nextBeat<c.currentTime+.12){const at=this.nextBeat,b=this.beat++%64,chord=[[38,45,50],[34,41,46],[36,43,48],[37,43,49]][Math.floor(b/16)];if(b%16===0){for(const note of chord)this.note(note,at,step*15,.065,'triangle');this.note(chord[0]-12,at,step*15,.09,'sine');}if(b%4===0)this.note(chord[0],at,.24,urgent?.14:.07,'sine');const melody=[74,null,77,null,73,null,69,null,74,null,70,null,73,null,65,null];if(b%2===0){const n=melody[(b/2)%16];if(n!==null)this.note(n,at,step*3,urgent?.085:.055,'sine');}if(urgent&&b%2===1)this.note(49,at,.12,.035,'triangle');this.nextBeat+=step;}}
    private note(midi:number,at:number,length:number,volume:number,type:OscillatorType){const c=this.context;if(!c||!this.music)return;const oscillator=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();oscillator.type=type;oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);filter.type='lowpass';filter.frequency.value=type==='triangle'?520:2400;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.05);gain.gain.exponentialRampToValueAtTime(.0001,at+length);oscillator.connect(filter).connect(gain).connect(this.music);oscillator.start(at);oscillator.stop(at+length+.02);oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect();};this.notes++;}

    private sources: AudioScheduledSourceNode[] = [];
    private noise: AudioBuffer | null = null;
    private voices = 0;
    private settings: PresentationSettings | null = null;
    private lastAlarm = -Infinity;
    private lastConfig = '';
    get ready() { return !!this.context && this.context.state === 'running'; }
    async unlock(settings: PresentationSettings) { this.settings = settings; if (settings.muted)
        return; try {
        if (!this.context) {
            const ctx = this.context = new AudioContext(), master = this.master = ctx.createGain(), effects = this.effects = ctx.createGain(), ambience = this.ambience = ctx.createGain(), limiter = ctx.createDynamicsCompressor();
            for(const kind of ['emergency','pokemon'] as const){const pcm=dangerSamples(kind,ctx.sampleRate),buffer=ctx.createBuffer(1,pcm.length,ctx.sampleRate);buffer.getChannelData(0).set(pcm);this.dangerBuffers.set(kind,buffer);}
            effects.connect(master);
            ambience.connect(master);
            master.connect(limiter);const analyser=this.analyser=ctx.createAnalyser();analyser.fftSize=256;limiter.connect(analyser).connect(ctx.destination);const music=this.music=ctx.createGain();music.connect(master);
            limiter.threshold.value = -16;
            limiter.ratio.value = 8;
            this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            const data = this.noise.getChannelData(0);
            let n = 581;
            for (let i = 0; i < data.length; i++) {
                n = (Math.imul(n, 1664525) + 1013904223) | 0;
                data[i] = (n >>> 0) / 2147483648 - 1;
            }
            const air = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
            air.buffer = this.noise;
            air.loop = true;
            filter.type = 'lowpass';
            filter.frequency.value = 320;
            const gain = ctx.createGain();
            gain.gain.value = .09;
            air.connect(filter).connect(gain).connect(ambience);
            air.start();
            const motor = ctx.createOscillator(), motorGain = ctx.createGain();
            motor.type = 'sine';
            motor.frequency.value = 54;
            motorGain.gain.value = .075;
            motor.connect(motorGain).connect(ambience);
            motor.start();
            this.sources.push(air, motor);this.nextBeat=ctx.currentTime+.04;this.musicTimer=setInterval(()=>this.score(),40);
        }
        this.preloadBattle();this.preloadFootsteps();await this.context.resume();
        this.configure(settings);
    }
    catch { /* Browsers may deny audio until another explicit gesture. */ } }
    configure(settings: PresentationSettings, active = true) { this.settings = settings;this.active=active;if(settings.muted||!active||settings.master<=0||settings.effects<=0)this.stopDanger(); if (!this.context)
        return; const key = JSON.stringify([settings.muted, settings.master, settings.effects, settings.ambience, settings.music, active]); if (key === this.lastConfig)
        return; this.lastConfig = key; const t = this.context.currentTime; this.master?.gain.setTargetAtTime(settings.muted || !active ? 0 : settings.master, t, .06); this.effects?.gain.setTargetAtTime(settings.effects, t, .04); this.ambience?.gain.setTargetAtTime(settings.ambience, t, .1);this.music?.gain.setTargetAtTime(settings.music*1.8, t, .15); }
    play(kind: CueKind, position: Vec, listener: Vec, yaw: number, surface = 'metal') {
        const ctx = this.context, s = this.settings;
        if (!ctx || ctx.state !== 'running' || !this.effects || s?.muted || this.voices > 12)
            return;
        if(kind==='step'){this.footstep(position,listener,yaw,surface);return;}
        if (['materialize', 'emergency'].includes(kind)) {
            if (ctx.currentTime - this.lastAlarm < 1.2)
                return;
            this.lastAlarm = ctx.currentTime;
        }
        const d = Math.hypot(position.x - listener.x, position.y - listener.y);
        if (d > 750)
            return;
        const pan = ctx.createStereoPanner(), gain = ctx.createGain();
        pan.pan.value = Math.max(-.85, Math.min(.85, Math.sin(Math.atan2(position.y - listener.y, position.x - listener.x) - yaw) * Math.min(1, d / 100)));
        gain.gain.value = (surface==='typing'?.34:kind==='selection'?.65:.36) / (1 + d / 160);
        pan.connect(gain).connect(this.effects);
        this.voices++;
        const t = ctx.currentTime;
        let duration = .25;
        const tone = (frequency: number, length: number, type: OscillatorType = 'sine', offset = 0, end = frequency, volume = .5) => { const source = ctx.createOscillator(), envelope = ctx.createGain(); source.type = type; source.frequency.setValueAtTime(frequency, t + offset); source.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + offset + length); envelope.gain.setValueAtTime(.001, t + offset); envelope.gain.linearRampToValueAtTime(volume, t + offset + .008); envelope.gain.exponentialRampToValueAtTime(.001, t + offset + length); source.connect(envelope).connect(pan); source.start(t + offset); source.stop(t + offset + length + .02); source.onended = () => { source.disconnect(); envelope.disconnect(); }; duration = Math.max(duration, length + offset + .03); };
        const noise = (length: number, frequency: number, volume = .4) => { if (!this.noise)
            return; const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain(); source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .65; envelope.gain.setValueAtTime(volume, t); envelope.gain.exponentialRampToValueAtTime(.001, t + length); source.connect(filter).connect(envelope).connect(pan); source.start(t, Math.random()); source.stop(t + length); source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); }; duration = Math.max(duration, length); };
        switch (kind) {
            case 'door':
                noise(.5, 480, .35);
                tone(70, .5, 'triangle', 0, 46, .2);
                break;
            case 'task-success':
            case 'extraction':
                tone(440, .17);
                tone(660, .2, 'sine', .12);
                tone(880, .35, 'sine', .25);
                break;
            case 'task-error':
                tone(150, .18, 'triangle', 0, 90);
                break;
            case 'guard':
                tone(350, .28, 'triangle', 0, 110, .6);
                break;
            case 'support':
                tone(330, .3, 'sine', 0, 660);
                break;
            case 'attack':
                if(['fire','dragon'].includes(surface)){noise(.48,650,.8);tone(90,.36,'sawtooth',0,42,.35);}
                else if(['electric','steel'].includes(surface)){tone(780,.12,'sawtooth',0,110,.45);tone(1200,.2,'square',.08,240,.2);noise(.24,2500,.5);}
                else if(['water','ice'].includes(surface)){noise(.45,2100,.8);tone(480,.4,'sine',0,120,.35);}
                else if(['psychic','ghost','fairy'].includes(surface)){tone(330,.4,'sine',0,990,.5);tone(440,.4,'triangle',.06,220,.25);}
                else{noise(.2,1300,.7);tone(180,.2,'triangle',0,55,.6);}

                break;
            case 'impact':
                noise(.1, 600, .8);
                break;
            case 'contain':
                tone(650, .38, 'sine', 0, 120);
                break;
            case 'resolved':
                tone(330, .5, 'sine', 0, 880);
                break;
            case 'materialize':
                noise(.7, 700, .25);
                tone(110, .65, 'sine', 0, 65);
                tone(440, .14, 'triangle', .1, 220, .2);
                break;
            case 'emergency':
                tone(420, .18, 'sine');
                tone(330, .2, 'sine', .25);
                break;
            case 'radio':
                noise(.12, 1800, .2);
                tone(920, .07, 'sine', .04, 700, .2);
                break;
            case 'selection':
                tone(480, .14, 'sine', 0, 720, .3);
                break;
            default: tone(surface==='typing'?1050:650, surface==='typing'?.035:.055, 'triangle', 0, surface==='typing'?560:420, surface==='typing'?.36:.3);
        }
        setTimeout(() => { pan.disconnect(); gain.disconnect(); this.voices = Math.max(0, this.voices - 1); }, Math.ceil(duration * 1000) + 80);
    }
    dispose() {for(const source of this.footVoices){try{source.stop();}catch{}}this.footVoices.clear();this.footsteps.clear();this.footstepsLoading=false;this.stopDanger();this.dangerBuffers.clear();if(this.musicTimer)clearInterval(this.musicTimer);this.musicTimer=null;this.lastConfig='';for(const source of this.battleVoices){try{source.stop();}catch{}}this.battleVoices.clear();this.battleSamples.clear();this.sampleLoading=false;for(const cry of this.cryActive){try{cry.stop();}catch{}}this.cryActive.clear();this.cryBuffers.clear();this.cryPending.clear();this.cryFailed.clear(); for (const source of this.sources) {
        try {
            source.stop();
            source.disconnect();
        }
        catch { }
    } this.sources = []; void this.context?.close(); this.context = null; this.master = this.effects = this.ambience = this.music = null;this.analyser=null; }
}

export const facilityAudio=new FacilityAudio();
