const STOP_WORDS = new Set([
  '现在', '可以', '这个', '那个', '什么', '怎么', '自己', '已经', '没有', '还是',
  '就是', '如果', '因为', '所以', '但是', '然后', '今天', '明天', '时候', '一下',
  '一个', '东西', '问题', '看看', '觉得', '应该', '需要', '不是', '我们', '你们',
  '他们', '这样', '那样', '知道', '开始', '完成', '确认', '处理', '用户', '消息',
  '任务', '结果', '内容', '情况', '部分', '方式', '功能', '文件',
]);

const TOKEN_RE = /[A-Za-z][A-Za-z0-9_-]{2,}|[\u4e00-\u9fff]{2,6}/g;

/** English words plus Chinese character bigrams; no external tokenizer. */
export function featuresOf(text: string): string[] {
  const out: string[] = [];
  for (const match of text.toLowerCase().match(TOKEN_RE) ?? []) {
    if (/^[a-z]/.test(match)) {
      if (!STOP_WORDS.has(match)) out.push(match);
      continue;
    }
    if (match.length === 2) {
      if (!STOP_WORDS.has(match)) out.push(match);
      continue;
    }
    for (let i = 0; i < match.length - 1; i += 1) {
      const gram = match.slice(i, i + 2);
      if (!STOP_WORDS.has(gram)) out.push(gram);
    }
  }
  return out;
}

export interface KeywordIndex {
  docCount: number;
  df: Record<string, number>;
  postings: Record<string, string[]>;
}

export function buildKeywordIndex(docs: Array<{ id: string; text: string }>): KeywordIndex {
  const df: Record<string, number> = {};
  const postings: Record<string, string[]> = {};
  for (const doc of docs) {
    for (const term of new Set(featuresOf(doc.text))) {
      df[term] = (df[term] ?? 0) + 1;
      (postings[term] ??= []).push(doc.id);
    }
  }
  return { docCount: docs.length, df, postings };
}

export function idf(term: string, index: KeywordIndex): number {
  return Math.log((index.docCount + 1) / ((index.df[term] ?? 0) + 1)) + 1;
}

/** IDF-weighted feature overlap, normalized so long notes cannot dominate. */
export function relevance(query: string, text: string, index: KeywordIndex): number {
  const qTerms = [...new Set(featuresOf(query))];
  const tTerms = new Set(featuresOf(text));
  if (qTerms.length === 0 || tTerms.size === 0) return 0;
  let hit = 0;
  let total = 0;
  for (const term of qTerms) {
    const weight = idf(term, index);
    total += weight;
    if (tTerms.has(term)) hit += weight;
  }
  const denominator = Math.sqrt(total * tTerms.size);
  return denominator > 0 ? Math.min(1, hit / denominator) : 0;
}
