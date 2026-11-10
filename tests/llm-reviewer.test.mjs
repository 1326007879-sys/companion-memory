import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LlmReviewer, MemoryStore, storePaths } from '../lib/core/index.js';

const REQUEST = { companionId: 'default', coldIds: [], system: '', candidateSummaries: [] };

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'companion-review-'));
  const store = new MemoryStore(storePaths(root));
  await store.ensure();
  return { root, store };
}

async function withCold(store, line) {
  await writeFile(join(store.paths.cold, '2026-11-10.jsonl'), `${JSON.stringify(line)}\n`, 'utf8');
}

test('review writes one note and one index line, then stays idempotent', async () => {
  const { root, store } = await fixture();
  try {
    await withCold(store, { id: 'dsh:one', seq: 1, role: 'user', content: '我叫小明' });
    let calls = 0;
    const adapter = {
      async complete() {
        calls++;
        return {
          text: JSON.stringify({ notes: [{
            name: 'name', description: '用户叫小明', type: 'user',
            evidence: '我叫小明', body: '用户叫小明',
          }] }),
        };
      },
    };
    const reviewer = new LlmReviewer(store, adapter, { retryDelayMs: 0 });

    const result = await reviewer.review(REQUEST);
    assert.equal(calls, 1);
    assert.equal(result.notes.length, 1);
    assert.equal((await store.listNotes()).length, 1);
    assert.equal((await store.readIndex()).length, 1);
    assert.equal((await store.readMeta()).lastProcessedSeq, 1);

    await reviewer.review(REQUEST);
    assert.equal(calls, 1, 'no pending candidates must not call the model');
    assert.equal((await store.listNotes()).length, 1, 'restart must not duplicate notes');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('malformed model output creates no notes and never invents facts', async () => {
  const { root, store } = await fixture();
  try {
    await withCold(store, { id: 'dsh:two', seq: 2, role: 'user', content: '今天天气不错' });
    const reviewer = new LlmReviewer(store, {
      async complete() { return { text: 'sorry, I cannot answer' }; },
    }, { retryDelayMs: 0 });

    const result = await reviewer.review(REQUEST);
    assert.equal(result.notes.length, 0);
    assert.equal((await store.listNotes()).length, 0);
    assert.equal((await store.readIndex()).length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a failed model call backs off instead of re-billing every idle tick', async () => {
  const { root, store } = await fixture();
  try {
    await withCold(store, { id: 'dsh:three', seq: 3, role: 'user', content: '记住我喜欢茶' });
    let calls = 0;
    const reviewer = new LlmReviewer(store, {
      async complete() {
        calls++;
        const error = new Error('budget');
        error.code = 'MONEY_BUDGET_EXCEEDED';
        throw error;
      },
    }, { retryDelayMs: 60_000 });

    await reviewer.review(REQUEST);
    await reviewer.review(REQUEST);
    assert.equal(calls, 1);
    assert.equal((await store.readMeta()).lastProcessedSeq, 0, 'watermark stays put on failure');
    assert.equal((await store.listNotes()).length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
