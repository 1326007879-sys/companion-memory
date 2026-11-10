import { open, stat, unlink } from 'node:fs/promises';
function isBusy(error) {
    return error?.code === 'EEXIST';
}
function delay(ms) {
    return new Promise((done) => setTimeout(done, ms));
}
/** One writer per store. A stale lock is removed only after `staleMs`. */
export class FileLockWriter {
    lockPath;
    staleMs;
    attempts;
    constructor(lockPath, staleMs = 30_000, attempts = 20) {
        this.lockPath = lockPath;
        this.staleMs = staleMs;
        this.attempts = attempts;
    }
    async withExclusive(fn) {
        for (let attempt = 0; attempt < this.attempts; attempt += 1) {
            try {
                const handle = await open(this.lockPath, 'wx');
                await handle.close();
                try {
                    return await fn();
                }
                finally {
                    await unlink(this.lockPath).catch(() => undefined);
                }
            }
            catch (error) {
                if (!isBusy(error))
                    throw error;
                try {
                    const info = await stat(this.lockPath);
                    if (Date.now() - info.mtimeMs > this.staleMs) {
                        await unlink(this.lockPath).catch(() => undefined);
                    }
                }
                catch {
                    // lock disappeared between attempts; retry immediately
                }
                await delay(50);
            }
        }
        throw new Error('Could not acquire the memory store lock');
    }
}
