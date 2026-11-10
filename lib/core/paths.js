import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
/** Explicit config wins, then the environment override, then ~/.companion. */
export function resolveStoreRoot(configured) {
    const raw = configured?.trim();
    if (raw)
        return isAbsolute(raw) ? raw : resolve(raw);
    const fromEnv = typeof process !== 'undefined'
        ? process.env.COMPANION_MEMORY_ROOT?.trim()
        : undefined;
    if (fromEnv)
        return isAbsolute(fromEnv) ? fromEnv : resolve(fromEnv);
    return join(homedir(), '.companion');
}
export function storePaths(root = resolveStoreRoot()) {
    return {
        root,
        meta: join(root, 'meta.json'),
        lock: join(root, '.lock'),
        memoryIndex: join(root, 'MEMORY.md'),
        notes: join(root, 'notes'),
        cold: join(root, 'cold'),
        journal: join(root, 'journal'),
        archive: join(root, 'archive'),
        index: join(root, 'index'),
        persona: join(root, 'persona.md'),
        profile: join(root, 'profile.md'),
        state: join(root, 'state.json'),
    };
}
