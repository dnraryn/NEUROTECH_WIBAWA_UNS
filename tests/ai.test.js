const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { browser, source } = require('./helpers');
function setup() {
  const b = browser(), calls = [], sent = [];
  Object.assign(b.c, { Event: b.c.CustomEvent, NT_APP_CHECK_SITE_KEY: 'public-test-site-key',
    initializeApp: () => ({}), ReCaptchaEnterpriseProvider: class {},
    initializeAppCheck: () => { calls.push('appcheck'); return {}; },
    getAI: () => { calls.push('ai'); return {}; }, GoogleAIBackend: class {},
    getToken: async () => { calls.push('verified'); return { token: 'private-test-token' }; },
    getGenerativeModel: () => ({ generateContent: async (request) => { sent.push(request); return { response: { text: () => 'Hasil masih sementara.' } }; } }),
    CURRENT_WORKER: { name: 'PRIVATE_NAME', email: 'PRIVATE_EMAIL', hrv: 99, fi: 100 },
    ntManagement: { snapshot: () => ({ message: 'Hasil parsial', latest: { fi: 42, cli: null, ei: 0,
      outputScope: 'frontal-only', qualityLevel: 'limited', classificationProvisional: true } }) },
  });
  vm.runInContext(source('ai-gemini.js').replace(/import\s+[\s\S]*?from\s+"https:[^"]+";/g, ''), b.c);
  return { b, calls, sent };
}
test('AI initializes App Check first and sends verified requests containing fresh partial data without identity or proxy HRV', async () => {
  const { b, calls, sent } = setup();
  const reply = await b.c.ntGemini([{ role: 'user', text: 'Jelaskan EEG' }, { role: 'model', error: true, text: 'PRIVATE_ERROR' }]);
  assert.equal(reply, 'Hasil masih sementara.');
  assert.deepEqual(calls, ['appcheck', 'ai', 'verified']);
  const prompt = JSON.stringify(sent[0]);
  for (const word of ['PRIVATE_NAME', 'PRIVATE_EMAIL', 'PRIVATE_ERROR', 'hrv']) assert.equal(prompt.includes(word), false);
  assert.ok(prompt.includes('\\"cli\\":null'));
  assert.ok(prompt.includes('\\"ei\\":0'));
});
test('emulator mode never makes a cloud AI or attestation request', async () => {
  const { b, calls, sent } = setup(); b.c.NT_FIREBASE = { emulators: true };
  await assert.rejects(b.c.ntGemini([{ role: 'user', text: 'Hallo' }]), /emulator/);
  assert.equal(sent.length, 0); assert.equal(calls.includes('verified'), false);
});
test('AI errors explain recovery without displaying provider URLs, keys or raw response bodies', () => {
  const b = browser(); b.load('ai-support.js');
  const text = b.c.ntAI.errorMessage({ message: '403 Firebase AI Logic deactivated: enforce App Check. https://example.invalid/?key=PRIVATE_SECRET' });
  assert.match(text, /Verifikasi keamanan/);
  assert.equal(text.includes('PRIVATE_SECRET'), false);
  assert.equal(text.includes('https:'), false);
  assert.match(b.c.ntAI.errorMessage({ code: '429' }), /Batas penggunaan/);
});
