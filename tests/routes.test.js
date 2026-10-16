const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { source } = require('./helpers');

test('live updates keep the same detail/content component type while route props carry the selected ID', () => {
  const code = source('app.jsx');
  const components = {
    ContentPage() {}, SupervisorWorkerDetail() {}, SupervisorAlertDetail() {}, SupervisorReportDetail() {},
    ROUTES: { login: { c() {}, frame: 'auth' } },
  };
  const resolver = vm.runInNewContext(code.slice(code.indexOf('const resolveRoute ='),
    code.indexOf('// Full-screen status')) + '\nresolveRoute;', components);
  for (const [page, name] of [
    ['workers', 'SupervisorWorkerDetail'], ['alerts', 'SupervisorAlertDetail'], ['reports', 'SupervisorReportDetail'],
  ]) {
    const route = { app: 's', page, id: 'one' };
    const first = resolver(route);
    for (let tick = 0; tick < 10; tick++) assert.equal(resolver(route).c, first.c);
    assert.equal(first.c, components[name]);
    assert.equal(first.props.id, 'one');
    const next = resolver({ ...route, id: 'two' });
    assert.equal(next.c, first.c);
    assert.equal(next.props.id, 'two');
  }
  assert.equal(resolver({ app: 'p', page: 'about' }).c, components.ContentPage);
  assert.equal(resolver({ app: 'p', page: 'about' }).props.slug, 'about');
  assert.equal(resolver({ app: 'login' }), components.ROUTES.login);
});
