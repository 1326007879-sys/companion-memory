import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { buildKeywordIndex, estimateTokens, MemoryStore, NoopReviewer, rawPage, recall, resolveStoreRoot, storePaths, summaryItems, } from '../../core/index.js';
import { SessionBindings } from './bindings.js';
import { isLongTermSourceAllowed, mapSessionEvent } from './events.js';
import { createDshLlmAdapter } from './llm.js';
import { mountPrompt } from './prompt.js';
import { createReviewScheduler } from './timing.js';
import { registerTools } from './tools.js';
export const inject = ['agents', 'systemPrompt', 'tools', 'llm'];
function today() {
    return new Date().toISOString().slice(0, 10);
}
function toRecallItem(note) {
    const fm = note.frontmatter;
    return {
        id: note.id,
        name: fm.name ?? note.id,
        summary: fm.description ?? '',
        text: note.body,
        type: fm.type ?? 'reference',
        strength: fm.strength ?? 0.5,
        importance: fm.confidence ?? 0.5,
        createdAt: Date.parse(fm.created ?? '') || 0,
        lastAccess: fm.lastAccess ?? 0,
        accessCount: fm.accessCount ?? 0,
        pinned: fm.pinned ?? false,
        state: fm.state ?? 'active',
        sourceRefs: fm.sourceRefs ?? [],
        evidence: fm.evidence ?? '',
    };
}
function fullFrontmatter(note) {
    const fm = note.frontmatter;
    return {
        name: fm.name ?? note.id,
        description: fm.description ?? '',
        type: fm.type ?? 'reference',
        created: fm.created ?? today(),
        updated: today(),
        evidence: fm.evidence ?? '',
        sourceRefs: fm.sourceRefs ?? [],
        supersededBy: fm.supersededBy ?? null,
        confidence: fm.confidence ?? 0.5,
        strength: fm.strength ?? 0.5,
        lastAccess: fm.lastAccess ?? 0,
        accessCount: fm.accessCount ?? 0,
        pinned: fm.pinned ?? false,
        state: fm.state ?? 'active',
    };
}
async function readColdSources(store, ids) {
    const wanted = new Set(ids);
    const files = await readdir(store.paths.cold).catch(() => []);
    const found = [];
    for (const file of files.filter((name) => name.endsWith('.jsonl'))) {
        const text = await readFile(join(store.paths.cold, file), 'utf8').catch(() => '');
        for (const line of text.split(/\r?\n/).filter(Boolean)) {
            const record = JSON.parse(line);
            if (record.id && wanted.has(record.id)) {
                found.push({
                    id: record.id,
                    day: record.day ?? file.replace('.jsonl', ''),
                    role: record.role ?? 'unknown',
                    content: record.content ?? '',
                });
            }
        }
    }
    return found;
}
export function createToolDeps(store, config, refresh) {
    return {
        async recall(query) {
            const notes = await store.listNotes();
            const index = buildKeywordIndex(notes.map((note) => ({
                id: note.id,
                text: `${note.frontmatter.name ?? ''} ${note.frontmatter.description ?? ''} ${note.body}`,
            })));
            const hits = recall(query, notes.map(toRecallItem), index, {
                minScore: config.minimumScore ?? 0.05,
                candidateBudget: config.candidateBudget ?? 24,
            });
            return {
                candidates: summaryItems(hits.map((hit) => ({ memoryId: hit.item.id, revision: 1, summary: hit.item.summary })), config.contextTokens ?? 800),
            };
        },
        async read(args) {
            const id = String(args.memoryId ?? '');
            const note = await store.readNote(id);
            if (!note)
                return { error: 'not_found', memoryId: id };
            const level = args.level === 'raw' ? 'raw' : 'refined';
            if (level === 'refined') {
                return {
                    memoryId: id, revision: 1, level,
                    summary: note.frontmatter.description ?? '',
                    body: note.body,
                    evidence: note.frontmatter.evidence ?? '',
                    sourceRefs: note.frontmatter.sourceRefs ?? [],
                };
            }
            const sources = await readColdSources(store, note.frontmatter.sourceRefs ?? []);
            const offset = Number(args.offset ?? 0);
            return { memoryId: id, revision: 1, level, ...rawPage(sources, offset) };
        },
        async save(args) {
            const text = String(args.text ?? '').trim();
            if (!text)
                return { error: 'empty_text' };
            const type = (['user', 'feedback', 'project', 'reference'].includes(String(args.type))
                ? String(args.type) : 'reference');
            const name = text.slice(0, 24).replace(/[\r\n]/g, ' ');
            const frontmatter = {
                name, description: text.slice(0, 320), type,
                created: today(), updated: today(),
                evidence: String(args.evidence ?? text),
                sourceRefs: [], supersededBy: null,
                confidence: 0.8, strength: 0.6,
                lastAccess: Date.now(), accessCount: 0,
                pinned: false, state: 'active',
            };
            const id = await store.writeNote(frontmatter, text);
            const lines = await store.readIndex();
            const result = await store.writeIndex([...lines, `- [${name}](notes/${id}) — ${text.slice(0, 80)}`]);
            await refresh();
            return { memoryId: id, indexWritten: result.ok, reason: result.reason };
        },
        async forget(args) {
            const id = String(args.memoryId ?? '');
            const note = await store.readNote(id);
            if (!note)
                return { error: 'not_found', memoryId: id };
            const frontmatter = fullFrontmatter(note);
            frontmatter.state = 'archived';
            await store.writeNote(frontmatter, note.body);
            const lines = await store.readIndex();
            await store.writeIndex(lines.filter((line) => !line.includes(`notes/${id})`)));
            await refresh();
            return { memoryId: id, archived: true, hostHistoryErased: false };
        },
        async stats() {
            const notes = await store.listNotes();
            const lines = await store.readIndex();
            const indexBytes = new TextEncoder().encode(`${lines.join('\n')}\n`).length;
            const issues = [];
            for (const note of notes) {
                if (!note.frontmatter.type)
                    issues.push(`missing type: ${note.id}`);
                if (!lines.some((line) => line.includes(`notes/${note.id})`)))
                    issues.push(`not in index: ${note.id}`);
                if (new TextEncoder().encode(note.body).length > 12_288)
                    issues.push(`oversized: ${note.id}`);
            }
            return { notes: notes.length, indexLines: lines.length, indexBytes, issues };
        },
    };
}
function applyPlugin(ctx, config) {
    const paths = storePaths(resolveStoreRoot(config.memoryRoot));
    const store = new MemoryStore(paths);
    const companionId = config.companionId ?? 'default';
    const adapter = createDshLlmAdapter(ctx);
    const reviewer = new NoopReviewer();
    let snapshot = '';
    const refresh = async () => {
        const budget = config.contextTokens ?? 800;
        const kept = [];
        for (const line of await store.readIndex()) {
            if (estimateTokens([...kept, line]) > budget)
                break;
            kept.push(line);
        }
        snapshot = kept.join('\n');
    };
    const deps = createToolDeps(store, config, refresh);
    const scheduler = createReviewScheduler({
        idleSeconds: config.idleReviewSeconds ?? 15,
        maxDelaySeconds: config.reviewMaxDelaySeconds ?? 60,
        onDue: async () => {
            if ((config.maintenanceMode ?? 'off') === 'off')
                return;
            const result = await reviewer.review({
                companionId, coldIds: [], system: '', candidateSummaries: [],
            });
            if (result.indexLines.length > 0)
                await store.writeIndex(result.indexLines);
            await refresh();
        },
    });
    void store.ensure(companionId).then(refresh);
    ctx.on('agent/created', ({ agent }) => {
        const bindings = new SessionBindings([{
                hostSessionId: agent.id, companionId, logicalChatId: agent.id,
            }]);
        agent.ctx.plugin?.({
            name: 'companion-memory-session',
            apply(child) {
                mountPrompt(child, () => snapshot);
                registerTools(child, deps);
                child.on('session/event', (session, event) => {
                    if (bindings.isBlocked(session.id) || !bindings.get(session.id))
                        return;
                    const record = mapSessionEvent(session, event);
                    if (!record || !isLongTermSourceAllowed(record))
                        return;
                    void store.appendCold(record).catch(() => undefined);
                    scheduler.markExchange(event.time);
                });
                child.on('agent/pre-step', () => { void refresh(); });
            },
        });
    });
    ctx.on('agent/disposed', () => { scheduler.stop(); });
    const runtime = {
        store, adapter, reviewer,
        snapshot: () => snapshot,
        stop: () => scheduler.stop(),
    };
    ctx.provide?.('companionMemory', runtime);
}
export function createCompanionMemoryPlugin(config = {}) {
    return {
        name: 'companion-memory',
        apply: (ctx) => applyPlugin(ctx, config),
    };
}
export default {
    name: 'companion-memory',
    apply: (ctx) => applyPlugin(ctx, {}),
};
