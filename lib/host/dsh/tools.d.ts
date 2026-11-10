import type { DshContext } from './contracts.js';
export interface ToolDeps {
    recall(query: string): Promise<unknown>;
    read(args: Record<string, unknown>): Promise<unknown>;
    save(args: Record<string, unknown>): Promise<unknown>;
    forget(args: Record<string, unknown>): Promise<unknown>;
    stats(): Promise<unknown>;
}
export declare const TOOL_NAMES: readonly ["memory_recall", "memory_read", "memory_save", "memory_forget", "memory_stats"];
export declare function registerTools(child: DshContext, deps: ToolDeps): void;
