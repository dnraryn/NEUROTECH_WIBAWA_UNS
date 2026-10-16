const test = require('node:test');
const assert = require('node:assert/strict');
const { browser } = require('./helpers');
function setup() { const b = browser(); b.c.ntMuseConnected = true; b.load('session-metrics.js'); return b; }
function second(b) { for (const channel of ['TP9', 'AF7', 'AF8', 'TP10']) b.emit('nt-muse-eeg', { channel, samples: new Float32Array(256) }); }
test('monitoring compliance uses actual received duration and an editable target, with no demo ticks', () => {
  const b = setup();
  assert.equal(b.c.ntSessionMetrics.get().compliance, 0);
  b.c.ntSessionMetrics.update({ targetMinutes: 1, sleepTargetHours: 8, sleptHours: null });
  for (let i = 0; i < 30; i++) second(b);
  assert.equal(b.c.ntSessionMetrics.get().compliance, 50);
  b.c.ntMuseConnected = false; second(b);
  assert.equal(b.c.ntSessionMetrics.get().compliance, 50);
  b.c.ntMuseConnected = true;
  for (let i = 0; i < 40; i++) second(b);
  assert.equal(b.c.ntSessionMetrics.get().compliance, 100);
});
test('sleep debt requires explicit sleep input, preserves zero and rejects invalid targets atomically', () => {
  const b = setup();
  assert.equal(b.c.ntSessionMetrics.get().sleepDebt, null);
  b.c.ntSessionMetrics.update({ targetMinutes: 60, sleepTargetHours: 8, sleptHours: 6.5 });
  assert.equal(b.c.ntSessionMetrics.get().sleepDebt, 1.5);
  assert.throws(() => b.c.ntSessionMetrics.update({ targetMinutes: 0, sleepTargetHours: 8, sleptHours: 3 }));
  assert.equal(b.c.ntSessionMetrics.get().sleptHours, 6.5);
  b.c.ntSessionMetrics.update({ targetMinutes: 60, sleepTargetHours: 8, sleptHours: 0 });
  assert.equal(b.c.ntSessionMetrics.get().sleepDebt, 8);
  b.c.ntSessionMetrics.update({ targetMinutes: 60, sleepTargetHours: 8, sleptHours: 9 });
  assert.equal(b.c.ntSessionMetrics.get().sleepDebt, 0);
});
test('records persist per account and reset daily counts without exposing another user\'s sleep', () => {
  const b = setup();
  b.c.ntSession.set({ code: 'A', memberId: 'one' });
  b.c.ntSessionMetrics.update({ targetMinutes: 45, sleepTargetHours: 8, sleptHours: 6 }); second(b);
  b.c.ntSession.set({ code: 'A', memberId: 'two' });
  assert.equal(b.c.ntSessionMetrics.get().sleepDebt, null);
  assert.equal(b.c.ntSessionMetrics.get().receivedMinutes, 0);
  b.c.ntSession.set({ code: 'A', memberId: 'one' });
  assert.equal(b.c.ntSessionMetrics.get().sleepDebt, 2);
  assert.equal(b.c.ntSessionMetrics.get().receivedMinutes, 1 / 60);
  b.setClock(1000 + 86400000);
  assert.equal(b.c.ntSessionMetrics.get().sleepDebt, null);
  assert.equal(b.c.ntSessionMetrics.get().receivedMinutes, 0);
  assert.equal(b.c.ntSessionMetrics.get().targetMinutes, 45);
});
