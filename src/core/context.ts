import { estimateTokens } from './disclosure.js';
import type { MemoryStore } from './store.js';

/**
 * Renders the prompt snapshot from the bounded index only. `cold` lines never
 * contribute, so the injected context stays constant as the log grows.
 */
export async function buildIndexSnapshot(store: MemoryStore, budget: number): Promise<string> {
  const kept: string[] = [];
  for (const line of await store.readIndex()) {
    if (estimateTokens([...kept, line]) > budget) break;
    kept.push(line);
  }
  return kept.join('\n');
}
