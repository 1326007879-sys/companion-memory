export interface Writer {
    withExclusive<T>(fn: () => Promise<T>): Promise<T>;
}
/** One writer per store. A stale lock is removed only after `staleMs`. */
export declare class FileLockWriter implements Writer {
    private readonly lockPath;
    private readonly staleMs;
    private readonly attempts;
    constructor(lockPath: string, staleMs?: number, attempts?: number);
    withExclusive<T>(fn: () => Promise<T>): Promise<T>;
}
