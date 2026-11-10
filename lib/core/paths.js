import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
/** Empty or unset config means one canonical store outside the dsh profile dir. */
export function resolveStoreRoot(configured) {
    const raw = configured?.trim();
    if (!raw)
        return join(homedir(), '.companion');
    return isAbsolute(raw) ? raw : resolve(raw);
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
