import { type LlmAdapter } from './llm-adapter.js';
import { type ReviewRequest, type ReviewResult, type Reviewer } from './review.js';
import type { MemoryStore } from './store.js';
export interface LlmReviewerOptions {
    companionId?: string;
    candidateBudget?: number;
    contextTokens?: number;
    retryDelayMs?: number;
    maxNotesPerBatch?: number;
}
/**
 * Turns unprocessed `cold` lines into notes through the host model. The store is
 * the single writer: notes, the bounded index and the watermark all go through it.
 * A failed model call backs off instead of re-billing on every idle tick.
 */
export declare class LlmReviewer implements Reviewer {
    private readonly store;
    private readonly adapter;
    private readonly options;
    private lastFailureAt;
    constructor(store: MemoryStore, adapter: LlmAdapter, options?: LlmReviewerOptions);
    review(request: ReviewRequest): Promise<ReviewResult>;
    /** Reads the newest append-only files and keeps lines after the watermark. */
    private pendingCandidates;
}
