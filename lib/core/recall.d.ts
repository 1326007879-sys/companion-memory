import { type KeywordIndex } from './indexer.js';
export interface RecallItem {
    id: string;
    name: string;
    summary: string;
    text: string;
    type: string;
    strength: number;
    importance: number;
    createdAt: number;
    lastAccess: number;
    accessCount: number;
    pinned: boolean;
    state: 'active' | 'archived';
    sourceRefs: string[];
    evidence: string;
}
export interface RecallHit {
    item: RecallItem;
    score: number;
}
export interface RecallOptions {
    limit?: number;
    minScore?: number;
    candidateBudget?: number;
    now?: number;
}
export declare const RECALL_WEIGHTS: {
    readonly relevance: 0.55;
    readonly strength: 0.2;
    readonly recency: 0.15;
    readonly importance: 0.1;
};
/** v0 has no zone strategy; weights stay explicit so v1 can tune them. */
export declare const ZONE_WEIGHTS: Record<string, number>;
/** No fallback: an empty result means "no memory", never "top-N anyway". */
export declare function recall(query: string, items: readonly RecallItem[], index: KeywordIndex, options?: RecallOptions): RecallHit[];
