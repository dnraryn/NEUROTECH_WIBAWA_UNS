const test=require('node:test'),assert=require('node:assert/strict');
const {browser,fakeMuse,feed}=require('./helpers');
async function setup(saved){const b=browser();fakeMuse(b);b.load('ble-muse.js');b.load('ble-muse-dsp.js');b.load('mock-data.jsx');if(saved)b.local.set('nt-muse-baseline-v4:A:one',JSON.stringify(saved));b.c.ntSession.set({code:'A',memberId:'one'});await b.c.ntDeviceConnect('real');return b;}
const base=()=>({fiRaw:3,cliRaw:2,eiRaw:1/3,thetaAlpha:.001,betaRel:100,algorithmVersion:'eeg-heuristic-v4',sampleRate:256,windowSize:512,protocol:'classic',ts:1000});
function send(b,samples){for(const channel of ['TP9','AF7','AF8','TP10'])b.emit('nt-muse-eeg',{channel,samples});}
// Independent direct DFT reference; production uses a radix-2 FFT.
function reference(input){const n=input.length,center=(n-1)/2,mean=Array.from(input).reduce((a,v)=>a+v,0)/n;
 let slope=0,den=0;for(let i=0;i<n;i++){slope+=(i-center)*(input[i]-mean);den+=(i-center)**2;}slope/=den;
 let energy=0;const values=Array.from(input,(v,i)=>{const h=.54-.46*Math.cos(2*Math.PI*i/(n-1));energy+=h*h;return(v-mean-slope*(i-center))*h;});
 const bands={delta:0,theta:0,alpha:0,beta:0,gamma:0};
 for(let k=2;k<=90;k++){let re=0,im=0;for(let i=0;i<n;i++){re+=values[i]*Math.cos(2*Math.PI*k*i/n);im-=values[i]*Math.sin(2*Math.PI*k*i/n);}const hz=k*.5,key=hz<4?'delta':hz<8?'theta':hz<13?'alpha':hz<30?'beta':'gamma';bands[key]+=(re*re+im*im)/(256*energy)*2*.5;}
 return bands;
}
test('band power matches an independent DFT with disjoint band edges and physical sine energy',async()=>{
 for(const frequency of [4,8,13,30]){const b=await setup();b.setClock(2000);const wave=Float32Array.from({length:512},(_,i)=>20*Math.sin(2*Math.PI*10*i/256)+5*Math.sin(2*Math.PI*frequency*i/256));send(b,wave);
  const actual=b.c.ntMuseDSP.last.absoluteBands,expected=reference(wave);for(const key of Object.keys(expected))assert.ok(Math.abs(actual[key]-expected[key])<.001,`${frequency} Hz ${key}`);
  const total=Object.values(actual).reduce((a,v)=>a+v,0);assert.ok(Math.abs(total-212.5)<3,'no boundary bin may be counted twice');
 }
});
test('initial high theta cannot trigger microsleep or prevent a clean personal calibration; smoothing starts at the new baseline',async()=>{
 const b=await setup(),wave=Float32Array.from({length:512},(_,i)=>20*Math.sin(2*Math.PI*6*i/256)+2*Math.sin(2*Math.PI*10*i/256)+Math.sin(2*Math.PI*20*i/256));
 for(let i=0;i<124;i++){b.setClock(2000+i*1000);send(b,wave);assert.equal(b.c.ntMuseDSP.last?.microsleep||false,false);}
 assert.equal(b.c.ntMuseDSP.baselineProgress,1);b.setClock(126000);send(b,wave);
 const out=b.c.ntMuseDSP.last;assert.equal(out.classificationProvisional,false);assert.equal(out.fi,40);assert.equal(out.cli,40);assert.equal(out.ei,50);
});
test('old saved baselines never skip a new connection calibration',async()=>{
 for(const change of [{ts:-86400000},{ts:1000000},{protocol:'athena'},{algorithmVersion:'eeg-heuristic-v3'},{sampleRate:250},{}]){
  const b=await setup({...base(),...change});assert.equal(b.c.ntMuseDSP.baseline,null);assert.equal(b.c.ntMuseDSP.baselineCount,0);
  b.setClock(2000);feed(b,{count:512});assert.equal(b.c.ntMuseDSP.calibration.stage,'stabilization');assert.equal(b.c.ntMuseDSP.baselineCount,0);
 }
});
test('microsleep requires calibrated consecutive windows and a scheduling gap breaks the streak',async()=>{
 const b=await setup(base());for(let i=0;i<124;i++){b.setClock(2000+i*1000);feed(b,{count:512,offset:i*256});}
 assert.ok(b.c.ntMuseDSP.baseline);
 const wave=Float32Array.from({length:512},(_,i)=>20*Math.sin(2*Math.PI*6*i/256)+2*Math.sin(2*Math.PI*10*i/256)+Math.sin(2*Math.PI*20*i/256));
 for(const [ts,expected] of [[126000,false],[127000,false],[128000,true],[130000,false],[131000,false],[132000,true]]){
  b.setClock(ts);send(b,wave);assert.equal(b.c.ntMuseDSP.last.microsleep,expected);
 }
});
