import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StorePaths } from './paths.js';
import {
  MAX_INDEX_BYTES,
  MAX_INDEX_LINES,
  STORE_LAYOUT,
  createEmptyMeta,
  formatNote,
  noteFromRecord,
  parseNote,
  validateColdRecord,
  type ColdRecord,
  type Meta,
  type NoteFrontmatter,
} from './schema.js';
import { FileLockWriter, type Writer } from './writer.js';

export interface StoredNote {
  id: string;
  frontmatter: Partial<NoteFrontmatter>;
  body: string;
}

function noteFileName(name: string): string {
  return `${name.replace(/[\\/:*?"<>|]/g, '_')}.md`;
}

export class MemoryStore {
  readonly paths: StorePaths;
  private readonly writer: Writer;

  constructor(paths: StorePaths, writer?: Writer) {
    this.paths = paths;
    this.writer = writer ?? new FileLockWriter(paths.lock);
  }

  /** Creates the canonical directory plus v1/v0-empty templates without overwriting data. */
  async ensure(companionId = 'default'): Promise<void> {
    await mkdir(this.paths.root, { recursive: true });
    for (const dir of STORE_LAYOUT.directories) {
      await mkdir(join(this.paths.root, dir), { recursive: true });
    }
    await writeFile(this.paths.meta, JSON.stringify(createEmptyMeta(companionId), null, 2), {
      flag: 'wx', encoding: 'utf8',
    }).catch(() => undefined);
    for (const file of STORE_LAYOUT.files.filter((f) => f !== 'meta.json' && f !== 'state.json')) {
      await writeFile(join(this.paths.root, file), '', { flag: 'wx', encoding: 'utf8' }).catch(() => undefined);
    }
    await writeFile(this.paths.state, '{}\n', { flag: 'wx', encoding: 'utf8' }).catch(() => undefined);
  }

  async appendCold(record: ColdRecord): Promise<void> {
    if (!validateColdRecord(record)) throw new Error('Invalid cold record');
    const file = join(this.paths.cold, `${record.day}.jsonl`);
    await this.writer.withExclusive(async () => {
      await appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
    });
  }

  async readCold(day: string): Promise<ColdRecord[]> {
    const text = await readFile(join(this.paths.cold, `${day}.jsonl`), 'utf8').catch(() => '');
    return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as ColdRecord)
      .filter(validateColdRecord);
  }

  async writeNote(frontmatter: NoteFrontmatter, body: string): Promise<string> {
    const id = noteFileName(frontmatter.name);
    await this.writer.withExclusive(async () => {
      await writeFile(join(this.paths.notes, id), formatNote(frontmatter, body), 'utf8');
    });
    return id;
  }

  async readNote(id: string): Promise<StoredNote | undefined> {
    const text = await readFile(join(this.paths.notes, id), 'utf8').catch(() => undefined);
    if (text === undefined) return undefined;
    const parsed = parseNote(text);
    return { id, frontmatter: noteFromRecord(parsed.frontmatter), body: parsed.body };
  }

  async listNotes(): Promise<StoredNote[]> {
    const names = await readdir(this.paths.notes).catch(() => [] as string[]);
    const notes = await Promise.all(names.filter((n) => n.endsWith('.md')).map((n) => this.readNote(n)));
    return notes.filter((n): n is StoredNote => n !== undefined);
  }

  async readMeta(): Promise<Meta> {
    const text = await readFile(this.paths.meta, 'utf8').catch(() => '');
    if (!text) return createEmptyMeta();
    return { ...createEmptyMeta(), ...(JSON.parse(text) as Partial<Meta>) };
  }

  async writeMeta(meta: Meta): Promise<void> {
    await this.writer.withExclusive(async () => {
      await writeFile(this.paths.meta, JSON.stringify(meta, null, 2), 'utf8');
    });
  }

  async readIndex(): Promise<string[]> {
    const text = await readFile(this.paths.memoryIndex, 'utf8').catch(() => '');
    return text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  }

  /** Write-before-limit gate. Returns a refusal instead of writing past the cap. */
  async writeIndex(lines: string[]): Promise<{ ok: boolean; reason?: string }> {
    const text = `${lines.join('\n')}\n`;
    if (lines.length > MAX_INDEX_LINES) return { ok: false, reason: `line cap ${MAX_INDEX_LINES}` };
    if (new TextEncoder().encode(text).length > MAX_INDEX_BYTES) {
      return { ok: false, reason: `byte cap ${MAX_INDEX_BYTES}` };
    }
    await this.writer.withExclusive(async () => {
      await writeFile(this.paths.memoryIndex, text, 'utf8');
    });
    return { ok: true };
  }
}
