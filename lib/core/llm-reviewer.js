import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { estimateTokens } from './disclosure.js';
import { isBudgetError } from './llm-adapter.js';
import { operationId, } from './review.js';
const REVIEW_SYSTEM = `You are a long-term memory curator. From the conversation lines below, extract only durable facts about the user, their explicit preferences, feedback, or ongoing projects.
Return STRICT JSON only: {"notes":[{"name":"short-slug","description":"one sentence","type":"user|feedback|project|reference","evidence":"verbatim quote from the input","body":"the fact in plain words"}]}
Rules: one fact per note; evidence must be copied verbatim from the input; never invent or infer emotions; skip greetings, transient tasks, tool output and roleplay; return {"notes":[]} when nothing is worth keeping.`;
const NOTE_TYPES = ['user', 'feedback', 'project', 'reference'];
function operationMarker(body) {
    return /<!-- op: ([a-f0-9]+) -->/.exec(body)?.[1];
}
/** Whitespace/case-tolerant containment so verbatim quotes survive line wrapping. */
function normalizeQuote(text) {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
}
function parseNotes(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start)
        return [];
    let parsed;
    try {
        parsed = JSON.parse(text.slice(start, end + 1));
    }
    catch {
        return [];
    }
    const raw = parsed?.notes;
    if (!Array.isArray(raw))
        return [];
    return raw.flatMap((item) => {
        if (!item || typeof item !== 'object')
            return [];
        const note = item;
        const name = String(note.name ?? '').trim().slice(0, 48);
        const description = String(note.description ?? '').trim().slice(0, 320);
        const evidence = String(note.evidence ?? '').trim().slice(0, 2000);
        const body = String(note.body ?? description).trim().slice(0, 12_000);
        const type = NOTE_TYPES.includes(note.type) ? note.type : 'reference';
        if (!name || !description || !body || !evidence)
            return [];
        return [{ name, description, type, evidence, sourceRefs: [], body }];
    });
}
/**
 * Turns unprocessed `cold` lines into notes through the host model. The store is
 * the single writer: notes, the bounded index and the watermark all go through it.
 * A failed model call backs off instead of re-billing on every idle tick.
 */
export class LlmReviewer {
    store;
    adapter;
    options;
    lastFailureAt = 0;
    constructor(store, adapter, options = {}) {
        this.store = store;
        this.adapter = adapter;
        this.options = options;
    }
    async review(request) {
        const empty = { notes: [], indexLines: [] };
        const retryDelay = this.options.retryDelayMs ?? 60_000;
        if (this.lastFailureAt > 0 && Date.now() - this.lastFailureAt < retryDelay)
            return empty;
        const meta = await this.store.readMeta();
        const candidates = await this.pendingCandidates(meta.lastProcessedSeq);
        const batch = candidates.slice(0, this.options.candidateBudget ?? 24);
        if (batch.length === 0)
            return empty;
        const budget = this.options.contextTokens ?? 800;
        const lines = [];
        const usedCandidates = [];
        let spent = 0;
        for (const item of batch) {
            const line = `[${item.role}] ${item.content.slice(0, 800)}`;
            const cost = estimateTokens(line);
            if (spent + cost > budget)
                break;
            lines.push(line);
            usedCandidates.push(item);
            spent += cost;
        }
        if (lines.length === 0)
            return empty;
        const haystack = normalizeQuote(lines.join('\n'));
        let answer;
        try {
            answer = (await this.adapter.complete({
                system: REVIEW_SYSTEM,
                messages: [{ role: 'user', content: lines.join('\n') }],
            })).text;
        }
        catch (error) {
            this.lastFailureAt = Date.now();
            meta.lastReviewAt = Date.now();
            await this.store.writeMeta(meta);
            if (isBudgetError(error))
                this.lastFailureAt += retryDelay;
            return empty;
        }
        const parsed = parseNotes(answer).slice(0, this.options.maxNotesPerBatch ?? 8);
        const companionId = request.companionId || this.options.companionId || 'default';
        const existing = await this.store.listNotes();
        const seen = new Set(existing.map((note) => operationMarker(note.body)).filter(Boolean));
        const indexLines = [...await this.store.readIndex()];
        const written = [];
        const today = new Date().toISOString().slice(0, 10);
        for (const note of parsed) {
            // Verbatim gate: an evidence quote the model was never shown (or garbled)
            // must never reach disk.
            const evidenceNorm = normalizeQuote(note.evidence);
            if (!haystack.includes(evidenceNorm))
                continue;
            const sourceRefs = usedCandidates
                .filter((item) => normalizeQuote(`[${item.role}] ${item.content.slice(0, 800)}`)
                .includes(evidenceNorm))
                .map((item) => item.id)
                .slice(0, 4);
            // A quote spanning two adjacent lines still passes the haystack check;
            // attribute it to the batch window instead of inventing a source.
            if (sourceRefs.length === 0)
                sourceRefs.push(usedCandidates[0].id);
            const payloadHash = createHash('sha256').update(JSON.stringify(note)).digest('hex');
            const opId = operationId(companionId, batch[0].id, batch[0].seq, payloadHash);
            if (seen.has(opId))
                continue;
            const safeName = note.name.replace(/[\\/:*?"<>|\r\n]/g, '_');
            const frontmatter = {
                name: safeName,
                description: note.description,
                type: note.type,
                created: today,
                updated: today,
                evidence: note.evidence,
                sourceRefs,
                supersededBy: null,
                confidence: 0.7,
                strength: 0.6,
                lastAccess: Date.now(),
                accessCount: 0,
                pinned: false,
                state: 'active',
            };
            const id = await this.store.writeNote(frontmatter, `${note.body}\n\n<!-- op: ${opId} -->`);
            const line = `- [${safeName}](notes/${id}) — ${note.description.slice(0, 80)}`;
            if (!indexLines.includes(line))
                indexLines.push(line);
            written.push(note);
            seen.add(opId);
        }
        if (written.length > 0)
            await this.store.writeIndex(indexLines);
        meta.lastProcessedSeq = Math.max(meta.lastProcessedSeq, ...batch.map((item) => item.seq));
        meta.lastReviewAt = Date.now();
        await this.store.writeMeta(meta);
        return { notes: written, indexLines };
    }
    /** Reads the newest append-only files and keeps lines after the watermark. */
    async pendingCandidates(afterSeq) {
        const files = await readdir(this.store.paths.cold).catch(() => []);
        const found = [];
        for (const file of files.filter((name) => name.endsWith('.jsonl')).sort().slice(-3)) {
            const text = await readFile(join(this.store.paths.cold, file), 'utf8').catch(() => '');
            for (const line of text.split(/\r?\n/).filter(Boolean)) {
                try {
                    const record = JSON.parse(line);
                    if (typeof record.seq === 'number' && record.seq > afterSeq
                        && typeof record.content === 'string' && record.content.trim()) {
                        found.push(record);
                    }
                }
                catch {
                    continue;
                }
            }
        }
        return found.sort((a, b) => a.seq - b.seq);
    }
}
