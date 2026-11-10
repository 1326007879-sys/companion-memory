export declare const SCHEMA_VERSION = 1;
export declare const MAX_INDEX_LINES = 200;
export declare const MAX_INDEX_BYTES = 25600;
export declare const NOTE_TYPES: readonly ["user", "feedback", "project", "reference"];
export type NoteType = (typeof NOTE_TYPES)[number];
export type NoteState = 'active' | 'archived';
export type MaintenanceMode = 'off' | 'preview' | 'auto';
export interface ColdRecord {
    id: string;
    day: string;
    ts: number;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    source: string;
    hostSessionId: string;
    seq: number;
    episodeId?: string;
    visibility: 'private' | 'group';
}
export interface NoteFrontmatter {
    name: string;
    description: string;
    type: NoteType;
    created: string;
    updated: string;
    evidence: string;
    sourceRefs: string[];
    supersededBy: string | null;
    confidence: number;
    strength: number;
    lastAccess: number;
    accessCount: number;
    pinned: boolean;
    state: NoteState;
}
export interface Meta {
    schemaVersion: number;
    companionId: string;
    writerEpoch: number;
    lastProcessedSeq: number;
    lastReviewAt: number;
    indexFingerprint: string;
    maintenanceMode: MaintenanceMode;
}
export declare const STORE_LAYOUT: {
    readonly directories: readonly ["notes", "cold", "journal", "archive", "index"];
    readonly files: readonly ["MEMORY.md", "meta.json", "persona.md", "profile.md", "state.json"];
};
export declare function createEmptyMeta(companionId?: string): Meta;
export declare function formatNote(frontmatter: NoteFrontmatter, body: string): string;
export declare function parseNote(text: string): {
    frontmatter: Record<string, string>;
    body: string;
};
export declare function noteFromRecord(raw: Record<string, string>): Partial<NoteFrontmatter>;
export declare function validateColdRecord(value: unknown): value is ColdRecord;
export declare function toScalar(value: unknown): string;
