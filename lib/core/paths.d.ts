export interface StorePaths {
    root: string;
    meta: string;
    lock: string;
    memoryIndex: string;
    notes: string;
    cold: string;
    journal: string;
    archive: string;
    index: string;
    persona: string;
    profile: string;
    state: string;
}
/** Explicit config wins, then the environment override, then ~/.companion. */
export declare function resolveStoreRoot(configured?: string): string;
export declare function storePaths(root?: string): StorePaths;
