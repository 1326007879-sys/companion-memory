import type { LlmAdapter } from '../../core/index.js';
import type { DshContext } from './contracts.js';
export interface ModelRoute {
    provider: string;
    model: string;
}
export interface LlmAdapterOptions {
    /** Explicit override; when both are set the current session route is ignored. */
    provider?: string;
    model?: string;
    /** Fallback: the model used by the most recent agent request. */
    route?: () => ModelRoute | undefined;
}
/**
 * Borrows the host's configured model through `ctx.llm.stream(options)`.
 * No API key, no network client and no provider fallback live in this package;
 * `llm/stream` waterfall listeners belong to the host runtime, not to us.
 */
export declare function createDshLlmAdapter(ctx: DshContext, options?: LlmAdapterOptions): LlmAdapter;
