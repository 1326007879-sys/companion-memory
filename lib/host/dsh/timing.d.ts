export interface ReviewScheduler {
    markExchange(at: number): void;
    trigger(): void;
    stop(): void;
}
export interface ReviewSchedulerOptions {
    idleSeconds: number;
    maxDelaySeconds: number;
    onDue: () => Promise<void> | void;
    tickMs?: number;
}
/** Local dispatch target only; provider cache behavior is not a promise. */
export declare function createReviewScheduler(options: ReviewSchedulerOptions): ReviewScheduler;
