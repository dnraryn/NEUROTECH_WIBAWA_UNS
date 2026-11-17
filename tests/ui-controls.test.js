const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { source } = require('./helpers');

test('shared action buttons preserve native disabled state and explicit form and accessibility attributes', () => {
  const code = source('router.jsx');
  const definition = code.slice(code.indexOf('const NeuroBtn ='), code.indexOf('const PageHeader ='));
  const js = transformSync(definition + '\nNeuroBtn;', { loader: 'jsx' }).code;
  const Button = vm.runInNewContext(js, { React });
  const disabled = renderToStaticMarkup(React.createElement(Button, {
    disabled: true, 'aria-label': 'Simpan anggota', 'aria-busy': true, children: 'Menyimpan',
  }));
  assert.match(disabled, /disabled=""/);
  assert.match(disabled, /aria-label="Simpan anggota"/); assert.match(disabled, /aria-busy="true"/);
  assert.match(disabled, /type="button"/, 'non-submit actions must not accidentally submit surrounding forms');
  const submit = renderToStaticMarkup(React.createElement(Button, { type: 'submit', children: 'Simpan' }));
  assert.match(submit, /type="submit"/); assert.doesNotMatch(submit, /disabled=/);
});
