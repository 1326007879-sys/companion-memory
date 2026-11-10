import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildIndexSnapshot, MAX_INDEX_BYTES, MAX_INDEX_LINES, MemoryStore, storePaths,
} from '../lib/core/index.js';
import { mapSessionEvent, isLongTermSourceAllowed, hostSourceId } from '../lib/host/dsh/events.js';
import { createToolDeps } from '../lib/host/dsh/plugin.js';

const DAY = '2026-11-10';
const SESSION = { id: 'sess-1', firstLiveSeq: 1 };
const BASE = { seq: 10, time: Date.parse(`${DAY}T10:00:00Z`), surfaceOp: 'append' };

function userEvent(overrides = {}) {
  return {
    ...BASE,
    type: 'user/message',
    data: { source: { kind: 'user' }, content: '下周三有个产品经理面试' },
    ...overrides,
  };
}

function assistantEvent(overrides = {}) {
  return {
    ...BASE,
    seq: 11,
    type: 'assistant/message',
    data: { message: { content: '好的，我记住了' } },
    ...overrides,
  };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'companion-accept-'));
  const store = new MemoryStore(storePaths(root));
  await store.ensure();
  return { root, store };
}

const noopRefresh = async () => {};

// §7-2: only direct, live, original appends cross the boundary.
test('§7-2 collection admits user/assistant, rejects replay, tool and interruptions', async () => {
  const { root, store } = await fixture();
  try {
    const user = mapSessionEvent(SESSION, userEvent());
    const assistant = mapSessionEvent(SESSION, assistantEvent());
    assert.ok(user);
    assert.ok(assistant);

    const tool = mapSessionEvent(SESSION, {
      ...BASE, seq: 12, type: 'tool/result',
      data: { message: { content: 'unverified tool output' } },
    });
    assert.ok(tool);
    assert.equal(isLongTermSourceAllowed(tool, {}), false, 'unverified tool output stays out');

    assert.equal(mapSessionEvent(SESSION, userEvent({ seq: 0 })), undefined);
    assert.equal(mapSessionEvent(SESSION, userEvent({ sourceEventSeqs: [1] })), undefined);
    assert.equal(mapSessionEvent(SESSION, userEvent({ surfaceOp: 'replace' })), undefined);
    assert.equal(mapSessionEvent(SESSION, userEvent({ ignorable: true })), undefined);
    assert.equal(mapSessionEvent(SESSION, assistantEvent({
      data: { interrupted: true, message: { content: 'partial' } },
    })), undefined);

    await store.appendCold(user);
    await store.appendCold(assistant);
    assert.equal((await store.readCold(DAY)).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// §7-4 / §7-5: recall hits, raw disclosure reaches the original wording, miss returns empty.
test('§7-4/5 recall, raw source paging and the zero-hit trap', async () => {
  const { root, store } = await fixture();
  try {
    const sourceId = hostSourceId(SESSION.id, 10);
    const noteId = await store.writeNote({
      name: '面试', description: '用户下周三有产品经理面试', type: 'user',
      created: DAY, updated: DAY, evidence: '下周三有个产品经理面试',
      sourceRefs: [sourceId], supersededBy: null,
      confidence: 0.8, strength: 0.6, lastAccess: Date.now(), accessCount: 0,
      pinned: false, state: 'active',
    }, '用户下周三有产品经理面试');
    await store.writeIndex([`- [面试](notes/${noteId}) — 用户下周三有产品经理面试`]);
    await writeFile(join(store.paths.cold, `${DAY}.jsonl`),
      `${JSON.stringify({ id: sourceId, day: DAY, role: 'user', content: '下周三有个产品经理面试，我妈反对我转行' })}\n`,
      'utf8');

    const deps = createToolDeps(store, {}, noopRefresh);
    const hit = await deps.recall('下周三面试');
    assert.ok(hit.candidates.length > 0);

    const raw = await deps.read({ memoryId: noteId, level: 'raw' });
    assert.equal(raw.level, 'raw');
    assert.ok(raw.sources.some((s) => s.content.includes('下周三有个产品经理面试')));

    const miss = await deps.recall('量子腌黄瓜宇宙飞船');
    assert.equal(miss.candidates.length, 0, 'no fallback, no fabrication');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// §7-6: the injected snapshot never grows with the append-only log.
test('§7-6 prompt size is constant across 30 conversation turns', async () => {
  const { root, store } = await fixture();
  try {
    await store.writeIndex(['- [固定事实](notes/fixed.md) — 用户喜欢茶']);
    const before = await buildIndexSnapshot(store, 800);
    const base = mapSessionEvent(SESSION, userEvent());
    for (let i = 0; i < 30; i += 1) {
      await store.appendCold({ ...base, id: hostSourceId(SESSION.id, 100 + i), seq: 100 + i });
    }
    assert.equal((await store.readCold(DAY)).length, 30);
    assert.equal(await buildIndexSnapshot(store, 800), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// §7-7: write-before-limit refuses both caps without touching the file.
test('§7-7 index writes are refused past the line/byte caps', async () => {
  const { root, store } = await fixture();
  try {
    const lines = Array.from({ length: MAX_INDEX_LINES + 1 },
      (_, i) => `- [n${i}](notes/n${i}.md) — x`);
    const tooMany = await store.writeIndex(lines);
    assert.equal(tooMany.ok, false);
    assert.match(tooMany.reason, /line cap/);

    const tooBig = await store.writeIndex([
      `- [big](notes/big.md) — ${'x'.repeat(MAX_INDEX_BYTES + 10)}`,
    ]);
    assert.equal(tooBig.ok, false);
    assert.match(tooBig.reason, /byte cap/);
    assert.equal((await store.readIndex()).length, 0, 'nothing was written');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// §7-8: forget removes the note from recall; re-initialising keeps user data.
test('§7-8 forget hides a memory and ensure() never deletes data', async () => {
  const { root, store } = await fixture();
  try {
    const deps = createToolDeps(store, {}, noopRefresh);
    const saved = await deps.save({ text: '用户叫小明', type: 'user' });
    assert.ok((await deps.recall('小明')).candidates.length > 0);

    await deps.forget({ memoryId: saved.memoryId });
    assert.equal((await deps.recall('小明')).candidates.length, 0);

    await store.ensure();
    assert.equal((await store.listNotes()).length, 1, 'uninstall/reinstall keeps data');
    assert.ok((await store.readIndex()).length <= 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
