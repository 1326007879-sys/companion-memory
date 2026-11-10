import type { MemoryStore } from './store.js';
/**
 * Renders the prompt snapshot from the bounded index only. `cold` lines never
 * contribute, so the injected context stays constant as the log grows.
 */
export declare function buildIndexSnapshot(store: MemoryStore, budget: number): Promise<string>;
