import assert from 'node:assert/strict';
import test from 'node:test';
import { mountPanel, PANEL_ID, TOOL_NAMES } from '../lib/client/index.js';

test('mountPanel is a no-op when the host slot service is absent', () => {
  assert.equal(mountPanel({}), false);
});

test('mountPanel registers a read-only sidebar entry', () => {
  const calls = [];
  const slots = {
    inject(name, factory) {
      calls.push(['inject', name]);
      return factory();
    },
    register(spec) {
      calls.push(['register', spec]);
      return spec;
    },
  };
  assert.equal(mountPanel({ slots }), true);
  assert.deepEqual(calls[0], ['inject', 'sidebar.footer.action']);
  const spec = calls[1][1];
  assert.equal(spec.id, PANEL_ID);
  assert.equal(spec.inject().readOnly, true);
  assert.deepEqual(spec.inject().toolNames, [...TOOL_NAMES]);
});

test('mountPanel never breaks host boot when registration throws', () => {
  const slots = {
    inject() { throw new Error('host slot failure'); },
    register() { return {}; },
  };
  assert.equal(mountPanel({ slots }), false);
});
