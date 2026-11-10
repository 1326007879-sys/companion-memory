import type { StorePaths } from './paths.js';
import { type ColdRecord, type Meta, type NoteFrontmatter } from './schema.js';
import { type Writer } from './writer.js';
export interface StoredNote {
    id: string;
    frontmatter: Partial<NoteFrontmatter>;
    body: string;
}
export declare class MemoryStore {
    readonly paths: StorePaths;
    private readonly writer;
    constructor(paths: StorePaths, writer?: Writer);
    /** Creates the canonical directory plus v1/v0-empty templates without overwriting data. */
    ensure(companionId?: string): Promise<void>;
    appendCold(record: ColdRecord): Promise<void>;
    readCold(day: string): Promise<ColdRecord[]>;
    writeNote(frontmatter: NoteFrontmatter, body: string): Promise<string>;
    readNote(id: string): Promise<StoredNote | undefined>;
    listNotes(): Promise<StoredNote[]>;
    readMeta(): Promise<Meta>;
    writeMeta(meta: Meta): Promise<void>;
    readIndex(): Promise<string[]>;
    /** Write-before-limit gate. Returns a refusal instead of writing past the cap. */
    writeIndex(lines: string[]): Promise<{
        ok: boolean;
        reason?: string;
    }>;
}
