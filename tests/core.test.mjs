import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ReviewTiming,
  buildKeywordIndex,
  featuresOf,
  recall,
  relevance,
  summaryItems,
} from '../lib/core/index.js';

test('Chinese text becomes bigram features', () => {
  const features = featuresOf('下周三面试');
  assert.ok(features.includes('下周'));
  assert.ok(features.includes('周三'));
});

test('relevance favors overlapping terms', () => {
  const docs = [
    { id: 'a', text: '下周三产品经理面试' },
    { id: 'b', text: '数据库索引配置' },
  ];
  const index = buildKeywordIndex(docs);
  assert.ok(relevance('面试准备', docs[0].text, index) > relevance('面试准备', docs[1].text, index));
});

test('recall returns empty when nothing clears the threshold', () => {
  const items = [{
    id: 'a', name: '面试', summary: '下周三产品经理面试', text: '下周三产品经理面试',
    type: 'user', strength: 0.5, importance: 0.5, createdAt: Date.now(),
    lastAccess: 0, accessCount: 0, pinned: false, state: 'active',
    sourceRefs: [], evidence: '',
  }];
  const index = buildKeywordIndex(items.map((item) => ({ id: item.id, text: item.text })));
  assert.deepEqual(recall('量子物理', items, index, { minScore: 0.99 }), []);
});

test('review timing waits 15s but never more than 60s from the first exchange', () => {
  const timing = new ReviewTiming();
  timing.complete(1000);
  timing.complete(2000);
  assert.equal(timing.dueAt(15, 60), 17000);
  timing.complete(50_000);
  assert.equal(timing.dueAt(15, 60), 61_000);
});

test('summaries respect the token budget and skip duplicates', () => {
  const memories = Array.from({ length: 10 }, (_, i) => ({
    memoryId: `m${i}`, revision: 1, summary: '一条需要占用预算的记忆摘要',
  }));
  const result = summaryItems([...memories, memories[0]], 40);
  assert.ok(result.length < memories.length);
  assert.equal(new Set(result.map((item) => item.memoryId)).size, result.length);
});
