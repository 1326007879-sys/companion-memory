import { ReviewTiming } from '../../core/index.js';
/** Local dispatch target only; provider cache behavior is not a promise. */
export function createReviewScheduler(options) {
    const timing = new ReviewTiming();
    const tick = options.tickMs ?? 1000;
    let stopped = false;
    const timer = setInterval(() => {
        if (stopped)
            return;
        if (timing.due(Date.now(), options.idleSeconds, options.maxDelaySeconds)) {
            timing.reset();
            void options.onDue();
        }
    }, tick);
    timer.unref?.();
    return {
        markExchange(at) {
            timing.complete(at);
        },
        trigger() {
            timing.reset();
            void options.onDue();
        },
        stop() {
            stopped = true;
            clearInterval(timer);
        },
    };
}
