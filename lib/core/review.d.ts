import type { NoteType } from './schema.js';
/** Same inputs always map to the same durable operation, so retries cannot double-write. */
export declare function operationId(companionId: string, coldId: string, seq: number, payloadHash: string): string;
/** Quiet 15s, but never more than 60s after the first unfinished exchange. */
export declare class ReviewTiming {
    private first?;
    private last?;
    private retryNotBefore;
    complete(at: number): void;
    dueAt(idleSeconds: number, maxDelaySeconds: number): number | null;
    due(now: number, idleSeconds: number, maxDelaySeconds: number): boolean;
    retryAfter(delayMs: number, now?: number): void;
    reset(): void;
}
export interface ReviewRequest {
    companionId: string;
    coldIds: string[];
    system: string;
    candidateSummaries: string[];
}
export interface ReviewNote {
    name: string;
    description: string;
    type: NoteType;
    evidence: string;
    sourceRefs: string[];
    body: string;
}
export interface ReviewResult {
    notes: ReviewNote[];
    indexLines: string[];
}
export interface Reviewer {
    review(request: ReviewRequest): Promise<ReviewResult>;
}
/** v0 skeleton: the host layer will inject an LLM-backed reviewer. */
export declare class NoopReviewer implements Reviewer {
    review(): Promise<ReviewResult>;
}
