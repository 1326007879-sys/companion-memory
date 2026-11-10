import { open, stat, unlink } from 'node:fs/promises';

export interface Writer {
  withExclusive<T>(fn: () => Promise<T>): Promise<T>;
}

function isBusy(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'EEXIST';
}

function delay(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

/** One writer per store. A stale lock is removed only after `staleMs`. */
export class FileLockWriter implements Writer {
  constructor(
    private readonly lockPath: string,
    private readonly staleMs = 30_000,
    private readonly attempts = 20,
  ) {}

  async withExclusive<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < this.attempts; attempt += 1) {
      try {
        const handle = await open(this.lockPath, 'wx');
        await handle.close();
        try {
          return await fn();
        } finally {
          await unlink(this.lockPath).catch(() => undefined);
        }
      } catch (error) {
        if (!isBusy(error)) throw error;
        try {
          const info = await stat(this.lockPath);
          if (Date.now() - info.mtimeMs > this.staleMs) {
            await unlink(this.lockPath).catch(() => undefined);
          }
        } catch {
          // lock disappeared between attempts; retry immediately
        }
        await delay(50);
      }
    }
    throw new Error('Could not acquire the memory store lock');
  }
}
