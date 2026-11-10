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
    apply: (ctx: DshContext) => void;
};
declare const _default: {
    name: string;
    apply: (ctx: DshContext) => void;
};
export default _default;
