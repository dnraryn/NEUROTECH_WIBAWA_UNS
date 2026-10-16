const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, fakeMuse } = require('./helpers');

test('Bluetooth capability requires the chooser API and HTTPS; policy denial never opens a chooser', async () => {
  const b = browser(); b.c.navigator.bluetooth = {}; b.load('ble-muse.js');
  assert.equal(b.c.ntMuse.supported(), false);
  const muse = fakeMuse(b);
  b.c.isSecureContext = false;
  assert.equal(b.c.ntMuse.supported(), false);
  b.c.isSecureContext = true;
  b.c.document = { permissionsPolicy: { features: () => ['bluetooth'], allowsFeature: () => false } };
  await assert.rejects(b.c.ntMuse.connect(), /diblokir/);
  assert.equal(muse.selections, 0);
});

test('pairing reports its stage, cancels an unresolved chooser, and ignores its late selection', async () => {
  const b = browser(), muse = fakeMuse(b), phases = [];
  b.load('ble-muse.js'); b.load('mock-data.jsx');
  b.c.addEventListener('nt-muse-phase', e => phases.push(e.detail.phase));
  let choose;
  b.c.navigator.bluetooth.requestDevice = () => new Promise(resolve => { choose = resolve; });
  const pending = b.c.ntDeviceConnect('real');
  assert.equal(b.c.ntMuse.status().phase, 'chooser');
  await b.c.ntDeviceDisconnect();
  choose(muse.device);
  await assert.rejects(pending, /dibatalkan/);
  assert.equal(muse.connections, 0);
  assert.equal(b.c.ntDeviceStatus().connected, false);
  b.c.navigator.bluetooth.requestDevice = async () => muse.device;
  await b.c.ntDeviceConnect('real');
  assert.deepEqual(phases.slice(-6), ['chooser', 'gatt', 'services', 'notifications', 'streaming', 'ready']);
  assert.equal(b.c.ntDeviceStatus().real, true);
});

test('denied browser permission gives recovery instructions and never switches to demo', async () => {
  const b = browser(); fakeMuse(b); b.load('ble-muse.js'); b.load('mock-data.jsx');
  b.c.navigator.bluetooth.requestDevice = async () => { throw Object.assign(new Error('native'), { name: 'NotAllowedError' }); };
  await assert.rejects(b.c.ntDeviceConnect('real'), /Chrome Android/);
  assert.equal(b.c.ntDeviceStatus().connected, false);
  assert.equal(b.c.NT_DEMO_DEVICE, false);
});
