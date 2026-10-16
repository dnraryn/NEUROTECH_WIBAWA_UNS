const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');
class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  dispatchEvent(event) {
    event.target ??= this;
    for (const handler of [...(this.listeners.get(event.type) || [])]) handler(event);
    return true;
  }
}
const clone = (value) => JSON.parse(JSON.stringify(value));
function browser() {
  let now = 1000;
  const timers = new Map(), local = new Map(), session = new Map(), errors = [];
  const storage = (map) => ({
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  });
  const events = new Events();
  const sandbox = {
    console: { info() {}, warn() {}, log() {}, error(...args) { errors.push(args); } },
    navigator: {}, performance: { now: () => now },
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    },
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    localStorage: storage(local), sessionStorage: storage(session),
    setInterval(fn) { const id = Symbol(); timers.set(id, fn); return id; },
    clearInterval(id) { timers.delete(id); },
    setTimeout(fn) { const id = Symbol(); timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
  const context = vm.createContext(sandbox);
  context.window = context;
  context.ntSession = {
    get() { return JSON.parse(context.sessionStorage.getItem('nt-session') || 'null'); },
    set(value) {
      const old = this.get();
      context.sessionStorage.setItem('nt-session', JSON.stringify(value));
      if (!old || old.code !== value.code || old.memberId !== value.memberId) emit('nt-session');
    },
    clear() { context.sessionStorage.removeItem('nt-session'); emit('nt-session'); },
  };
  const emit = (type, detail) => context.dispatchEvent(new context.CustomEvent(type, { detail }));
  return { c: context, emit, local, errors, setClock(value) { now = value; },
    tick() { for (const fn of [...timers.values()]) fn(); },
    load(name) { return vm.runInContext(source(name), context, { filename: name }); } };
}
function fakeMuse(b, missing, athena = false) {
  const chars = new Map(), commands = [];
  for (const id of (athena ? ['0001', '0013', '0014'] : ['0001', '000b', '0003', '0004', '0005', '0006'])) {
    if (id === missing) continue;
    const char = new Events();
    char.uuid = `273e${id}-4c4d-454d-96be-f03bac821358`;
    char.properties = { notify: true, writeWithoutResponse: true };
    char.startNotifications = async () => char;
    char.writeValue = async (packet) => commands.push(String.fromCharCode(...packet.slice(1, -1)));
    char.writeValueWithoutResponse = char.writeValue;
    chars.set(id, char);
  }
  const device = new Events();
  device.name = 'Muse-test';
  let connections = 0, selections = 0;
  device.gatt = {
    connected: false,
    async connect() { connections++; this.connected = true; return this; },
    async getPrimaryService() { return {
      async getCharacteristics() { return [...chars.values()]; },
      async getCharacteristic(uuid) {
        const characteristic = chars.get(uuid.slice(4, 8));
        if (!characteristic) throw new Error('Missing test characteristic');
        return characteristic;
      },
    }; },
    disconnect() { this.connected = false; device.dispatchEvent({ type: 'gattserverdisconnected' }); },
  };
  b.c.navigator.bluetooth = { async requestDevice() { selections++; return device; } };
  const notify = (id, bytes) => {
    const characteristic = chars.get(id);
    characteristic.value = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    characteristic.dispatchEvent({ type: 'characteristicvaluechanged' });
  };
  return { device, chars, commands, notify, get connections() { return connections; },
    get selections() { return selections; } };
}
function feed(b, { count = 256, offset = 0, amplitude = 1, channels = ['TP9', 'AF7', 'AF8', 'TP10'] } = {}) {
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = (offset + i) / 256;
    samples[i] = amplitude * (12 * Math.sin(2 * Math.PI * 10 * t) +
      3 * Math.sin(2 * Math.PI * 6 * t) + 7 * Math.sin(2 * Math.PI * 20 * t));
  }
  channels.forEach((channel) => b.emit('nt-muse-eeg', { channel, samples }));
}
module.exports = { browser, fakeMuse, feed, source, clone };
