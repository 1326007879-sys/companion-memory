import { MemoryStore, type LlmAdapter, type Reviewer } from '../../core/index.js';
import type { DshContext } from './contracts.js';
import { type ToolDeps } from './tools.js';
export declare const inject: string[];
export interface Config {
    memoryRoot?: string;
    companionId?: string;
    idleReviewSeconds?: number;
    reviewMaxDelaySeconds?: number;
    candidateBudget?: number;
    contextTokens?: number;
    minimumScore?: number;
    maintenanceMode?: 'off' | 'preview' | 'auto';
    /** Empty = borrow the model route of the current session request header. */
    reviewProvider?: string;
    reviewModel?: string;
}
export interface PluginRuntime {
    store: MemoryStore;
    adapter: LlmAdapter;
    reviewer: Reviewer;
    snapshot(): string;
    stop(): void;
}
export declare function createToolDeps(store: MemoryStore, config: Config, refresh: () => Promise<void>): ToolDeps;
export declare function createCompanionMemoryPlugin(config?: Config): {
    name: string;
    inject: string[];
    apply: (ctx: DshContext) => void;
};
/**
 * The host loader reads `inject` from the plugin object / entry options, not
 * from a module-level named export. Without it, cordis refuses every
 * `ctx.systemPrompt` / `ctx.tools` / `ctx.llm` access and the entry never
 * activates.
 */
declare const _default: {
    name: string;
    inject: string[];
    apply: (ctx: DshContext) => void;
};
export default _default;
