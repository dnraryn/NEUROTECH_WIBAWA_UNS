const test = require('node:test');
const assert = require('node:assert/strict');
const { browser } = require('./helpers');
const settle = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const b = browser(), locks = [], visibility = new Set();
  b.c.isSecureContext = true;
  b.c.ntMuseConnected = false;
  b.c.ntMuse = { supported: () => true, status: () => ({ connected: b.c.ntMuseConnected }) };
  b.c.document = { visibilityState: 'visible', addEventListener: (_, callback) => visibility.add(callback) };
  b.c.navigator.wakeLock = { request: async () => {
    const handlers = [];
    const lock = { released: false, addEventListener: (_, fn) => handlers.push(fn),
      release: async () => { lock.released = true; handlers.forEach(fn => fn()); } };
    locks.push(lock); return lock;
  } };
  b.load('mobile-monitoring.js');
  return { b, locks, connect: async value => { b.c.ntMuseConnected = value; b.emit('nt-device'); await settle(); },
    visible: async value => { b.c.document.visibilityState = value ? 'visible' : 'hidden'; visibility.forEach(fn => fn()); await settle(); } };
}
test('screen wake lock is opt in and held only for a real connected visible session', async () => {
  const { b, locks, connect } = setup();
  await connect(true); assert.equal(locks.length, 0);
  await b.c.ntMobileMonitor.setKeepAwake(true);
  assert.equal(b.c.ntMobileMonitor.state().awake, true);
  await connect(false); assert.equal(locks[0].released, true);
  assert.equal(b.c.ntMobileMonitor.state().awake, false);
});
test('backgrounding releases the lock and foreground return reacquires it without inventing BLE state', async () => {
  const { b, locks, connect, visible } = setup();
  await connect(true); await b.c.ntMobileMonitor.setKeepAwake(true);
  await visible(false); assert.equal(locks[0].released, true);
  assert.equal(b.c.ntMobileMonitor.state().visible, false);
  await visible(true); assert.equal(locks.length, 2);
  b.emit('nt-session'); await settle(); assert.equal(locks[1].released, true);
  assert.equal(b.c.ntMobileMonitor.state().keepAwake, false);
});
test('a wake lock completing after disconnect is immediately released', async () => {
  const { b, connect } = setup(); let complete, releases = 0;
  b.c.navigator.wakeLock.request = () => new Promise(resolve => { complete = resolve; });
  await connect(true); const pending = b.c.ntMobileMonitor.setKeepAwake(true);
  await connect(false); complete({ release: async () => { releases++; } }); await pending;
  assert.equal(releases, 1); assert.equal(b.c.ntMobileMonitor.state().awake, false);
});
test('unsupported browsers and denied screen locks remain explicit and never start demo monitoring', async () => {
  const { b, connect } = setup();
  b.c.ntMuse.supported = () => false;
  b.c.navigator.onLine = false;
  assert.equal(b.c.ntMobileMonitor.state().bluetooth, false);
  assert.equal(b.c.ntMobileMonitor.state().online, false);
  await connect(true);
  b.c.navigator.wakeLock.request = async () => { throw Error('private-device-detail'); };
  await b.c.ntMobileMonitor.setKeepAwake(true);
  assert.match(b.c.ntMobileMonitor.state().message, /Layar belum/);
  assert.ok(!b.c.ntMobileMonitor.state().message.includes('private-device-detail'));
  assert.equal(b.c.NT_DEMO_DEVICE, undefined);
});
