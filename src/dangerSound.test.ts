import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dangerSamples} from './dangerSound';
test('alerts stay bounded, have smooth edges and a finite tail at browser sample rates',()=>{
  for(const rate of [44100,48000]) for(const kind of ['pokemon','emergency'] as const){
    const pcm=dangerSamples(kind,rate);
    assert.equal(pcm.length,Math.ceil(rate*(kind==='emergency'?2.85:2.05)));
    assert.equal(pcm[0],0);
    let peak=0,energy=0,jump=0;
    for(let i=0;i<pcm.length;i++){assert.ok(Number.isFinite(pcm[i]));peak=Math.max(peak,Math.abs(pcm[i]));energy+=pcm[i]*pcm[i];if(i)jump=Math.max(jump,Math.abs(pcm[i]-pcm[i-1]));}
    assert.ok(peak>.2&&peak<.8,'audible headroom without clipping');
    assert.ok(Math.sqrt(energy/pcm.length)>.035,'non-silent alert');
    assert.ok(jump<.06,'smooth waveform without clicks');
    assert.ok(Math.abs(pcm[pcm.length-1])<.0001,'clean tail');
  }
});
