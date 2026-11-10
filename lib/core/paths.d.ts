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
/** Empty or unset config means one canonical store outside the dsh profile dir. */
export declare function resolveStoreRoot(configured?: string): string;
export declare function storePaths(root?: string): StorePaths;
