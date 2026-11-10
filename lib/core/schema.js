export const SCHEMA_VERSION = 1;
export const MAX_INDEX_LINES = 200;
export const MAX_INDEX_BYTES = 25600;
export const NOTE_TYPES = ['user', 'feedback', 'project', 'reference'];
export const STORE_LAYOUT = {
    directories: ['notes', 'cold', 'journal', 'archive', 'index'],
    files: ['MEMORY.md', 'meta.json', 'persona.md', 'profile.md', 'state.json'],
};
export function createEmptyMeta(companionId = 'default') {
    return {
        schemaVersion: SCHEMA_VERSION,
        companionId,
        writerEpoch: 1,
        lastProcessedSeq: 0,
        lastReviewAt: 0,
        indexFingerprint: '',
        maintenanceMode: 'auto',
    };
}
function scalar(value) {
    if (value === null || value === undefined)
        return '';
    if (Array.isArray(value))
        return value.join(', ');
    return String(value);
}
export function formatNote(frontmatter, body) {
    const lines = [
        '---',
        `name: ${frontmatter.name}`,
        `description: ${frontmatter.description}`,
        `type: ${frontmatter.type}`,
        `created: ${frontmatter.created}`,
        `updated: ${frontmatter.updated}`,
        `evidence: ${frontmatter.evidence}`,
        `sourceRefs: ${frontmatter.sourceRefs.join(', ')}`,
        `supersededBy: ${frontmatter.supersededBy ?? ''}`,
        `confidence: ${frontmatter.confidence}`,
        `strength: ${frontmatter.strength}`,
        `lastAccess: ${frontmatter.lastAccess}`,
        `accessCount: ${frontmatter.accessCount}`,
        `pinned: ${frontmatter.pinned}`,
        `state: ${frontmatter.state}`,
        '---',
        '',
        body.trim(),
        '',
    ];
    return lines.join('\n');
}
export function parseNote(text) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
    if (!match)
        return { frontmatter: {}, body: text };
    const frontmatter = {};
    for (const line of match[1].split(/\r?\n/)) {
        const at = line.indexOf(':');
        if (at < 1)
            continue;
        frontmatter[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    return { frontmatter, body: text.slice(match[0].length).trim() };
}
export function noteFromRecord(raw) {
    return {
        name: raw.name,
        description: raw.description,
        type: NOTE_TYPES.includes(raw.type) ? raw.type : undefined,
        created: raw.created,
        updated: raw.updated,
        evidence: raw.evidence,
        sourceRefs: (raw.sourceRefs ?? '').split(',').map((v) => v.trim()).filter(Boolean),
        supersededBy: raw.supersededBy || null,
        confidence: Number(raw.confidence ?? 0.5),
        strength: Number(raw.strength ?? 0.5),
        lastAccess: Number(raw.lastAccess ?? 0),
        accessCount: Number(raw.accessCount ?? 0),
        pinned: raw.pinned === 'true',
        state: raw.state === 'archived' ? 'archived' : 'active',
    };
}
export function validateColdRecord(value) {
    if (!value || typeof value !== 'object')
        return false;
    const v = value;
    return typeof v.id === 'string'
        && /^\d{4}-\d{2}-\d{2}$/.test(String(v.day))
        && typeof v.ts === 'number'
        && typeof v.content === 'string'
        && typeof v.hostSessionId === 'string'
        && Number.isSafeInteger(v.seq)
        && (v.role === 'user' || v.role === 'assistant' || v.role === 'tool');
}
export function toScalar(value) {
    return scalar(value);
}
