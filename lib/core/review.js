import { createHash } from 'node:crypto';
/** Same inputs always map to the same durable operation, so retries cannot double-write. */
export function operationId(companionId, coldId, seq, payloadHash) {
    return createHash('sha256')
        .update(JSON.stringify([companionId, coldId, seq, payloadHash]))
        .digest('hex');
}
/** Quiet 15s, but never more than 60s after the first unfinished exchange. */
export class ReviewTiming {
    first;
    last;
    retryNotBefore = 0;
    complete(at) {
        this.first = this.first === undefined ? at : Math.min(this.first, at);
        this.last = this.last === undefined ? at : Math.max(this.last, at);
    }
    dueAt(idleSeconds, maxDelaySeconds) {
        if (this.first === undefined || this.last === undefined || idleSeconds <= 0)
            return null;
        return Math.max(this.retryNotBefore, Math.min(this.last + idleSeconds * 1000, this.first + maxDelaySeconds * 1000));
    }
    due(now, idleSeconds, maxDelaySeconds) {
        const at = this.dueAt(idleSeconds, maxDelaySeconds);
        return at !== null && now >= at;
    }
    retryAfter(delayMs, now = Date.now()) {
        this.complete(now);
        this.retryNotBefore = now + delayMs;
    }
    reset() {
        this.first = undefined;
        this.last = undefined;
        this.retryNotBefore = 0;
    }
}
/** v0 skeleton: the host layer will inject an LLM-backed reviewer. */
export class NoopReviewer {
    async review() {
        return { notes: [], indexLines: [] };
    }
}
