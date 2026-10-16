const test=require('node:test'),assert=require('node:assert/strict');
const {browser}=require('./helpers');
function setup(){const b=browser();b.load('session-insights.js');return b.c.ntSessionInsights;}
const minute=(fi=40,changes={})=>({minute:0,n:60,partial:0,provisional:0,fi:fi*60,cli:40*60,ei:50*60,incidents:0,...changes});
const row=(minutes=[minute()],changes={})=>({source:'muse',algorithmVersion:'eeg-heuristic-v4',minutes,...changes});
test('conclusions require enough calibrated results and do not classify empty, demo, legacy, or calibration-only data',()=>{
 const api=setup();
 for(const r of [null,row([]),row([minute(99,{provisional:60})]),row([minute()],{algorithmVersion:'eeg-heuristic-v3'}),row([minute()],{source:'demo'}),row([minute(40,{n:1,fi:40,cli:40,ei:50})])]){
  const result=api.assess(r);assert.equal(result.ready,false);assert.equal(result.status,'unavailable');
 }
});
test('mixed calibration minutes are excluded without estimating their unrecorded calibrated sums',()=>{
 const result=setup().assess(row([minute(100,{provisional:10}),minute(0,{minute:1})]));
 assert.equal(result.ready,true);assert.equal(result.meanFI,0);assert.equal(result.status,'normal');assert.equal(result.calibratedWindows,60);
});
test('poor quality cannot become a reassuring conclusion and microsleep indications remain visible despite a low session mean',()=>{
 const api=setup();assert.equal(api.assess(row([minute(0,{partial:100})])).reason,'quality');
 const result=api.assess(row([minute(0,{incidents:1})]));assert.equal(result.status,'kritis');assert.match(result.action,/indikasi microsleep/);
});
test('assessment uses weighted calibrated windows and ignores malformed measurements',()=>{
 const api=setup(),result=api.assess(row([minute(20),minute(80,{n:30,fi:80*30,cli:40*30,ei:50*30}),null,minute(0,{fi:Infinity}),minute(99,{n:-1})]));
 assert.equal(result.meanFI,40);assert.equal(result.calibratedWindows,90);assert.equal(result.ready,true);
 assert.equal(api.assess(row({bad:true})).ready,false);
});
