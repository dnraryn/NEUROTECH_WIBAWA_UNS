const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { browser, source } = require('./helpers');

test('worker app manifest opens the worker area with real PNG icon sizes and no invitation identity', () => {
  const manifest = JSON.parse(source('manifest.webmanifest'));
  const fs = require('node:fs'), path = require('node:path');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/?app=worker#/w/readiness');
  assert.equal(manifest.scope, '/');
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const bytes = fs.readFileSync(path.resolve(__dirname, '..', '.' + icon.src));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(icon.sizes, `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`);
  }
});

test('installation requires a browser prompt and can be retried after dismissal; installed state removes it', async () => {
  const b = browser(); b.load('pwa-client.js');
  assert.equal(await b.c.ntPWA.install(), 'manual');
  let calls = 0;
  const prompt = { type: 'beforeinstallprompt', preventDefault() {}, prompt: async () => { calls++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
  b.c.dispatchEvent(prompt);
  assert.equal(b.c.ntPWA.state().canInstall, true);
  assert.equal(await b.c.ntPWA.install(), 'dismissed');
  assert.equal(calls, 1); assert.equal(b.c.ntPWA.state().canInstall, false);
  b.c.dispatchEvent(prompt); assert.equal(b.c.ntPWA.state().canInstall, true);
  b.emit('appinstalled'); assert.equal(b.c.ntPWA.state().installed, true);
  assert.equal(b.c.ntPWA.state().canInstall, false);
});

test('service worker updates cannot reload an active measurement or an unfinished archive', async () => {
  const b = browser(), messages = [], listeners = {};
  const reg = { active: {}, waiting: { postMessage: msg => messages.push(msg) }, addEventListener() {} };
  b.c.isSecureContext = true;
  b.c.navigator.serviceWorker = { addEventListener(type, fn) { listeners[type] = fn; }, register: async () => reg };
  let reloads = 0;
  b.c.location = { reload: () => reloads++ };
  b.load('pwa-client.js'); b.emit('load');
  await Promise.resolve(); await Promise.resolve();
  b.c.ntDeviceStatus = () => ({ connected: true });
  assert.throws(() => b.c.ntPWA.update(), /Akhiri sesi/);
  assert.equal(messages.length, 0);
  b.c.ntDeviceStatus = () => ({ connected: false });
  b.c.ntSessionArchive = { state: () => ({ activeId: 'recording' }) };
  assert.throws(() => b.c.ntPWA.update(), /Akhiri sesi/);
  b.c.ntSessionArchive.state = () => ({ activeId: null });
  assert.equal(b.c.ntPWA.update(), true);
  assert.equal(messages[0].type, 'NT_APPLY_UPDATE');
  listeners.controllerchange(); assert.equal(reloads, 1);
});

test('service worker caches only its static allowlist; API, cross-origin, query URLs and writes bypass it', async () => {
  const listeners = {}, added = [], deleted = [], fetched = [];
  const cache = { async addAll(urls) { added.push(...urls); }, async match(request) { return 'cached:' + (request.url || request); } };
  const scope = {
    self: { location: { origin: 'https://test.local' }, addEventListener(type, fn) { listeners[type] = fn; }, clients: { claim: async () => {} }, skipWaiting() {} },
    caches: { open: async () => cache, keys: async () => ['nt-worker-static-old', 'another-app-cache'], delete: async key => deleted.push(key) },
    URL, Set, fetch: async request => { fetched.push(request.url); if (request.fail) throw Error('offline'); return 'network'; },
  };
  vm.runInNewContext(source('service-worker.js').replace('/* build:assets */ []', '["/offline.html","/application.hash.js"]'), scope);
  let pending;
  listeners.install({ waitUntil(promise) { pending = promise; } }); await pending;
  assert.deepEqual(added, ['/offline.html', '/application.hash.js']);
  listeners.activate({ waitUntil(promise) { pending = promise; } }); await pending;
  assert.deepEqual(deleted, ['nt-worker-static-old']);
  const request = (url, extra = {}) => {
    let response;
    listeners.fetch({ request: { url, method: 'GET', mode: 'cors', ...extra }, respondWith(value) { response = value; } });
    return response;
  };
  for (const [url, extra] of [
    ['https://firestore.googleapis.com/accounts', {}], ['https://test.local/private-report.csv', {}],
    ['https://test.local/application.hash.js?token=private', {}], ['https://test.local/application.hash.js', { method: 'POST' }],
  ]) assert.equal(request(url, extra), undefined);
  assert.equal(await request('https://test.local/application.hash.js'), 'cached:https://test.local/application.hash.js');
  assert.equal(await request('https://test.local/?app=worker', { mode: 'navigate' }), 'network');
  assert.equal(await request('https://test.local/?app=worker', { mode: 'navigate', fail: true }), 'cached:/offline.html');
});
