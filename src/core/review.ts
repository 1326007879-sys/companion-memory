import { createHash } from 'node:crypto';
import type { NoteType } from './schema.js';

/** Same inputs always map to the same durable operation, so retries cannot double-write. */
export function operationId(
  companionId: string,
  coldId: string,
  seq: number,
  payloadHash: string,
): string {
  return createHash('sha256')
    .update(JSON.stringify([companionId, coldId, seq, payloadHash]))
    .digest('hex');
}

/** Quiet 15s, but never more than 60s after the first unfinished exchange. */
export class ReviewTiming {
  private first?: number;
  private last?: number;
  private retryNotBefore = 0;

  complete(at: number): void {
    this.first = this.first === undefined ? at : Math.min(this.first, at);
    this.last = this.last === undefined ? at : Math.max(this.last, at);
  }

  dueAt(idleSeconds: number, maxDelaySeconds: number): number | null {
    if (this.first === undefined || this.last === undefined || idleSeconds <= 0) return null;
    return Math.max(this.retryNotBefore, Math.min(
      this.last + idleSeconds * 1000,
      this.first + maxDelaySeconds * 1000,
    ));
  }

  due(now: number, idleSeconds: number, maxDelaySeconds: number): boolean {
    const at = this.dueAt(idleSeconds, maxDelaySeconds);
    return at !== null && now >= at;
  }

  retryAfter(delayMs: number, now = Date.now()): void {
    this.complete(now);
    this.retryNotBefore = now + delayMs;
  }

  reset(): void {
    this.first = undefined;
    this.last = undefined;
    this.retryNotBefore = 0;
  }
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
export class NoopReviewer implements Reviewer {
  async review(): Promise<ReviewResult> {
    return { notes: [], indexLines: [] };
  }
}
