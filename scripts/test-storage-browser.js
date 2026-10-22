process.env.DEBUG = '';
const http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
const fs = require('node:fs');
let chromium;
try { ({chromium} = require(process.env.NT_PLAYWRIGHT_MODULE || path.resolve('.tools/browser/node_modules/playwright-core'))); }
catch { console.error('Optional browser test: install playwright-core under .tools/browser or set NT_PLAYWRIGHT_MODULE to its module path.'); process.exit(1); }

let server, browser;
(async () => {
  server = http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local archive test</title>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const executablePath=process.env.NT_BROWSER_EXECUTABLE || (fs.existsSync(edge) ? edge : undefined);
  browser=await chromium.launch({executablePath,headless:true});
  const context=await browser.newContext(), page=await context.newPage();
  const initialize=async()=>{
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(()=>{
      localStorage.setItem('storage-test-user',localStorage.getItem('storage-test-user')||'fixture-one');
      window.ntSession={get:()=>({uid:localStorage.getItem('storage-test-user'),code:'TEST',memberId:localStorage.getItem('storage-test-user'),role:'pekerja'})};
      window.ntMuseConnected=true;window.ntMuse={status:()=>({connected:true,protocol:'athena',connectedAt:Date.now()-10000})};
      window.CURRENT_WORKER={shift:'Pagi'};
      window.ntSessionMetrics={get:()=>({sleptHours:7,sleepTargetHours:8,targetMinutes:60})};
    });
    for(const name of ['session-insights.js','report-export.js','session-archive.js']) await page.addScriptTag({path:path.resolve(name)});
    await page.waitForFunction(()=>window.ntSessionArchive.state().ready);
  };
  await initialize();
  await page.evaluate(()=>{
    window.ntSessionArchive.begin();
    const ts=Date.now();window.ntMuseDSP={baselineTarget:40,baseline:{ts:ts-1000},signalState:'ready',last:{ts,fi:40,cli:30,ei:60,qualityLevel:'good',outputScope:'full',classificationProvisional:false,microsleep:false}};
    window.dispatchEvent(new CustomEvent('nt-data'));
    window.dispatchEvent(new CustomEvent('nt-muse-eeg',{detail:{channel:'AF7',samples:[1,2,3]}}));
  });
  await context.setOffline(true);
  await page.evaluate(()=>window.ntSessionArchive.finish());
  const saved=await page.evaluate(()=>window.ntSessionArchive.state());
  assert.equal(saved.storage,'device');assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].status,'completed');
  assert.equal(saved.rows[0].summary.clean,1);assert.equal(saved.rows[0].synced,false);
  await context.setOffline(false);await initialize();
  const reloaded=await page.evaluate(()=>window.ntSessionArchive.state().rows);
  assert.equal(reloaded.length,1);assert.equal(reloaded[0].id,saved.rows[0].id);assert.equal(reloaded[0].receivedSamples,3);
  await page.evaluate(()=>{localStorage.setItem('storage-test-user','fixture-two');window.dispatchEvent(new CustomEvent('nt-session'));});
  await page.waitForFunction(()=>window.ntSessionArchive.state().ready);
  assert.equal(await page.evaluate(()=>window.ntSessionArchive.state().rows.length),0);
  console.log(JSON.stringify({nativeIndexedDB:true,offlineCompletion:true,reloadPreservesRecord:true,noDuplicates:true,accountIsolation:true,cloudNotFalselyAcknowledged:true}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
