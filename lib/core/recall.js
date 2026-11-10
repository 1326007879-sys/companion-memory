import { relevance } from './indexer.js';
export const RECALL_WEIGHTS = {
    relevance: 0.55,
    strength: 0.2,
    recency: 0.15,
    importance: 0.1,
};
/** v0 has no zone strategy; weights stay explicit so v1 can tune them. */
export const ZONE_WEIGHTS = {
    user: 1.0,
    feedback: 1.0,
    project: 1.0,
    reference: 1.0,
};
/** No fallback: an empty result means "no memory", never "top-N anyway". */
export function recall(query, items, index, options = {}) {
    const limit = options.limit ?? 8;
    const minScore = options.minScore ?? 0.05;
    const budget = options.candidateBudget ?? 24;
    const now = options.now ?? Date.now();
    return items
        .filter((item) => item.state !== 'archived')
        .map((item) => {
        const rel = relevance(query, `${item.name} ${item.summary} ${item.text}`, index)
            * (ZONE_WEIGHTS[item.type] ?? 1);
        const recency = Math.exp(-Math.max(0, now - item.createdAt) / (30 * 86_400_000));
        const score = RECALL_WEIGHTS.relevance * rel
            + RECALL_WEIGHTS.strength * item.strength
            + RECALL_WEIGHTS.recency * recency
            + RECALL_WEIGHTS.importance * item.importance;
        return { item, score: Math.round(score * 10_000) / 10_000 };
    })
        .filter((hit) => hit.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(limit, budget));
}
