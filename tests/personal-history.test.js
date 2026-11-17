const test=require('node:test'),assert=require('node:assert/strict');
const {browser}=require('./helpers');
const user={uid:'worker',role:'pekerja',code:'A'};
const minute=(changes={})=>({minute:0,n:2,partial:0,provisional:0,fi:40,cli:120,ei:160,incidents:1,...changes});
const record=(changes={})=>({id:'one',source:'muse',companyCode:'A',ownerUid:'worker',memberId:'worker',startedAt:1000,minutes:[minute()],...changes});
function setup(){const b=browser();b.setClock(10*86400000);b.c.ntSession.set(user);b.load('session-insights.js');b.load('management-data.js');return b;}

test('personal timeline and daily averages isolate the worker, company, source and chosen period',()=>{
  const b=setup(),api=b.c.ntSessionInsights;
  const own=record(),other=record({id:'other',ownerUid:'other'}),foreign=record({id:'foreign',companyCode:'B'}),demo=record({id:'demo',source:'demo'});
  const timeline=api.personalSeries([own,other,foreign,demo]);
  assert.equal(timeline.length,1);assert.equal(timeline[0].sessionId,'one');assert.equal(timeline[0].fi,20);assert.equal(timeline[0].incidents,1);
  assert.equal(api.personalSeries([own],{days:1}).length,0);
  assert.equal(api.personalSeries([own],{days:0}).length,1);
  b.c.ntSession.clear();assert.equal(api.personalSeries([own]).length,0);assert.equal(api.personalDays([own]).length,0);
});

test('daily graph weights actual per-metric samples and separates provisional and clean series without fabricating missing load',()=>{
  const b=setup(),api=b.c.ntSessionInsights;
  const first=record({previewMinutes:[{minute:0,n:8,fiN:8,fi:0,cliN:0,cli:0,eiN:8,ei:160,limited:8,uncalibrated:8}]}),second=record({id:'two',startedAt:2000,previewMinutes:[{minute:0,n:2,fiN:2,fi:200,cliN:1,cli:80,eiN:0,ei:0,limited:2,uncalibrated:2}]});
  const preview=api.personalSeries([first,second],{metricSource:'preview'});
  assert.equal(preview[0].fi,0);assert.equal(preview[0].cli,null);assert.equal(preview[0].incidents,0);assert.equal(preview[0].provisional,true);
  const p=api.personalDays([first,second],{metricSource:'preview'})[0];
  assert.equal(p.fi,20);assert.equal(p.cli,80);assert.equal(p.ei,20);
  const clean=api.personalDays([first,second])[0];assert.equal(clean.fi,20);assert.equal(clean.cli,60);assert.equal(clean.ei,80);
  assert.equal(api.personalSeries([record({minutes:[minute({n:0,fi:0,cli:0,ei:0,incidents:0})]})]).length,0);
});

test('an archived preview is explicitly provisional and only used when no clean personal record is available',()=>{
  const b=setup(),p=record({previewMinutes:[{minute:0,n:1,fiN:1,fi:73,cliN:0,cli:0,eiN:1,ei:0,limited:1,uncalibrated:1}],summary:{clean:0}});
  const result=b.c.ntManagement.personalResult([p],null,'worker');
  assert.equal(result.kind,'preview');assert.equal(result.provisional,true);assert.equal(result.metrics.fi,73);assert.equal(result.metrics.cli,null);assert.equal(result.metrics.ei,0);
  assert.equal(b.c.ntManagement.personalResult([{...p,ownerUid:'foreign'}],null,'worker').kind,'empty');
  const clean=record({id:'clean',summary:{clean:1,meanFI:22,meanCLI:40,meanEI:60}});
  assert.equal(b.c.ntManagement.personalResult([p,clean],null,'worker').kind,'archive');
});
