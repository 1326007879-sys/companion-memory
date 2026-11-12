import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MemoryStore, storePaths } from '../lib/core/index.js';
import { createCompanionMemoryPlugin } from '../lib/host/dsh/plugin.js';

/**
 * §7-3 end-to-end: one live session event, an idle tick, a host-shaped
 * `llm/stream` response, then exactly one note with evidence and sourceRefs.
 * The stream is a protocol-level stand-in for `ctx.llm.stream()` so the whole
 * plugin chain is exercised without spending real model quota.
 */
test('§7-3 idle review writes one evidenced note and stays idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'companion-e2e-'));
  const store = new MemoryStore(storePaths(root));
  await store.ensure();

  const handlers = new Map();
  let runtime;
  let calls = 0;

  const ctx = {
    on(event, fn) {
      const list = handlers.get(event) ?? [];
      list.push(fn);
      handlers.set(event, list);
      return () => {};
    },
    get() { return undefined; },
    provide(name, value) { if (name === 'companionMemory') runtime = value; },
    systemPrompt: { context() {} },
    tools: { register() {} },
    llm: {
      async *stream() {
        calls += 1;
        yield { type: 'block-start' };
        yield {
          type: 'text-delta',
          text: JSON.stringify({ notes: [{
            name: '面试',
            description: '用户下周三有产品经理面试',
            type: 'user',
            evidence: '下周三有个产品经理面试',
            body: '用户下周三有产品经理面试',
          }] }),
        };
        yield { type: 'finish', reason: { kind: 'stop' } };
      },
    },
  };

  try {
    createCompanionMemoryPlugin({
      memoryRoot: root,
      maintenanceMode: 'auto',
      reviewProvider: 'mock',
      reviewModel: 'mock',
      idleReviewSeconds: 0.05,
      reviewMaxDelaySeconds: 0.2,
    }).apply(ctx);

    handlers.get('agent/created')[0]({ agent: { id: 'sess-1' } });
    handlers.get('session/event')[0](
      { id: 'sess-1', firstLiveSeq: 1 },
      {
        seq: 10,
        time: Date.now(),
        type: 'user/message',
        surfaceOp: 'append',
        data: { source: { kind: 'user' }, content: '下周三有个产品经理面试' },
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 1400));
    assert.equal(calls, 1, 'the host stream was used exactly once');

    const notes = await store.listNotes();
    assert.equal(notes.length, 1);
    assert.equal(notes[0].frontmatter.evidence, '下周三有个产品经理面试');
    assert.ok(notes[0].frontmatter.sourceRefs.length > 0);
    assert.equal((await store.readIndex()).length, 1);
    assert.equal((await store.readMeta()).lastProcessedSeq, 10);

    await runtime.reviewer.review({
      companionId: 'default', coldIds: [], system: '', candidateSummaries: [],
    });
    assert.equal((await store.listNotes()).length, 1, 're-running must not duplicate');
    assert.equal(calls, 1, 're-running must not bill the model again');
  } finally {
    runtime?.stop();
    await rm(root, { recursive: true, force: true });
  }
});
