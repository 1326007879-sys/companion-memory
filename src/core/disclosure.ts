export interface SummaryItem {
  memoryId: string;
  revision: number;
  summary: string;
  availableLayers: ['refined', 'raw'];
}

export interface DisclosureCandidate {
  memoryId: string;
  revision: number;
  summary: string;
  detailsUnavailable?: boolean;
}

export function estimateTokens(value: unknown): number {
  return Math.ceil(new TextEncoder().encode(JSON.stringify(value)).length / 3);
}

/** Summaries are the only layer that enters the prompt; details are fetched on demand. */
export function summaryItems(
  memories: readonly DisclosureCandidate[],
  tokenBudget: number,
  maxItems = 24,
): SummaryItem[] {
  if (!Number.isFinite(tokenBudget) || tokenBudget <= 0) return [];
  const result: SummaryItem[] = [];
  const seen = new Set<string>();
  const limit = Math.min(24, Math.max(0, Math.floor(maxItems)));
  for (const memory of memories) {
    if (result.length >= limit) break;
    if (!memory.summary.trim()) continue;
    const key = `${memory.memoryId}:${memory.revision}`;
    if (seen.has(key)) continue;
    const item: SummaryItem = {
      memoryId: memory.memoryId,
      revision: memory.revision,
      summary: memory.summary,
      availableLayers: ['refined', 'raw'],
    };
    if (estimateTokens([...result, item]) > tokenBudget) continue;
    result.push(item);
    seen.add(key);
  }
  return result;
}

/** Raw pages never truncate a source in the middle. */
export function rawPage<T>(
  sources: readonly T[],
  offset = 0,
  pageSize = 4,
): { sources: T[]; nextOffset?: number } {
  const start = Math.max(0, Math.floor(offset));
  const sourcesPage = sources.slice(start, start + pageSize);
  const next = start + pageSize;
  return next < sources.length ? { sources: [...sourcesPage], nextOffset: next } : { sources: [...sourcesPage] };
}
