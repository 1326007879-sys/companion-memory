import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MemoryStore, storePaths } from '../lib/core/index.js';
import { createCompanionMemoryPlugin } from '../lib/host/dsh/plugin.js';

/**
 * Regression for the desktop boot failure and the silent per-agent binding:
 * tools and the session hook must live on the plugin's own ctx, not in a child
 * plugin whose services and event scope never resolve in the real host.
 */
test('registers tools and collects session events on the plugin ctx', async () => {
  const root = await mkdtemp(join(tmpdir(), 'companion-bind-'));
  const store = new MemoryStore(storePaths(root));
  await store.ensure();

  const handlers = new Map();
  const tools = [];
  const prompts = [];
  let childPlugins = 0;
  let runtime;

  const ctx = {
    on(event, fn) {
      const list = handlers.get(event) ?? [];
      list.push(fn);
      handlers.set(event, list);
      return () => {};
    },
    get() { return undefined; },
    provide(name, value) { if (name === 'companionMemory') runtime = value; },
    plugin() { childPlugins += 1; },
    systemPrompt: { context(spec) { prompts.push(spec.name); } },
    tools: { register(spec) { tools.push(spec.name); } },
    llm: { async *stream() { yield { type: 'finish', reason: { kind: 'stop' } }; } },
  };

  try {
    createCompanionMemoryPlugin({ memoryRoot: root }).apply(ctx);

    assert.equal(childPlugins, 0, 'no per-agent child plugin may be created');
    assert.deepEqual([...tools].sort(), [
      'memory_forget', 'memory_read', 'memory_recall', 'memory_save', 'memory_stats',
    ], 'all five tools must be registered on the plugin ctx');
    assert.ok(prompts.includes('companion:memory'), 'prompt section must be mounted');
    assert.equal(handlers.get('session/event').length, 1, 'session hook must be on the plugin ctx');

    const emit = (event) => handlers.get('session/event')[0](
      { id: 'sess-x', firstLiveSeq: 1 }, event,
    );
    emit({
      seq: 7,
      time: Date.now(),
      type: 'user/message',
      surfaceOp: 'append',
      data: { source: { kind: 'user' }, content: '我喜欢喝绿茶' },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    const files = (await readdir(join(root, 'cold'))).filter((f) => f.endsWith('.jsonl'));
    assert.equal(files.length, 1, 'one daily cold file');
    const coldFile = join(root, 'cold', files[0]);
    const lines = (await readFile(coldFile, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.equal(record.role, 'user');
    assert.equal(record.content, '我喜欢喝绿茶');

    emit({
      seq: 8,
      time: Date.now(),
      type: 'tool/result',
      surfaceOp: 'append',
      data: { message: { content: 'tool noise' } },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = (await readFile(coldFile, 'utf8')).trim().split('\n');
    assert.equal(after.length, 1, 'unverified tool output must not be archived');
  } finally {
    runtime?.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test('ships no client bundle (the host loads client.js as a classic script)', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.dsh.client, undefined, 'dsh.client must not be declared');
  assert.equal(pkg.exports['./client'], undefined, 'no ./client export');
  assert.equal(
    existsSync(new URL('../lib/client/index.js', import.meta.url)),
    false,
    'no ESM client file may be shipped',
  );
});

test('declares inject on the plugin object and the bundle entry', async () => {
  const expected = ['agents', 'systemPrompt', 'tools', 'llm'];
  const mod = await import('../lib/index.js');
  assert.deepEqual(mod.default.inject, expected, 'host loader reads inject from the plugin object');
  assert.deepEqual(mod.createCompanionMemoryPlugin().inject, expected);
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8');
  assert.match(patch, /inject:\s*\[agents,\s*systemPrompt,\s*tools,\s*llm\]/);
});
