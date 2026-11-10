import type { DshContext } from './contracts.js';

export interface ToolDeps {
  recall(query: string): Promise<unknown>;
  read(args: Record<string, unknown>): Promise<unknown>;
  save(args: Record<string, unknown>): Promise<unknown>;
  forget(args: Record<string, unknown>): Promise<unknown>;
  stats(): Promise<unknown>;
}

export const TOOL_NAMES = [
  'memory_recall',
  'memory_read',
  'memory_save',
  'memory_forget',
  'memory_stats',
] as const;

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});

export function registerTools(child: DshContext, deps: ToolDeps): void {
  child.tools?.register({
    name: 'memory_recall',
    description: 'Recall memories related to the current topic. Returns summaries only; use memory_read for details.',
    parameters: object({ query: { type: 'string' } }, ['query']),
    execute: (args) => deps.recall(String(args.query ?? '')),
  });
  child.tools?.register({
    name: 'memory_read',
    description: 'Expand one memory. level=refined returns the note; level=raw returns source references with paging.',
    parameters: object({
      memoryId: { type: 'string' },
      revision: { type: 'number' },
      level: { type: 'string', enum: ['refined', 'raw'] },
      offset: { type: 'number' },
    }, ['memoryId']),
    execute: (args) => deps.read(args),
  });
  child.tools?.register({
    name: 'memory_save',
    description: 'Manually store one durable fact with its original wording as evidence.',
    parameters: object({
      text: { type: 'string' },
      type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference'] },
      evidence: { type: 'string' },
    }, ['text']),
    execute: (args) => deps.save(args),
  });
  child.tools?.register({
    name: 'memory_forget',
    description: 'Soft-archive a memory and remove it from the index. Does not touch host chat history.',
    parameters: object({ memoryId: { type: 'string' }, reason: { type: 'string' } }, ['memoryId']),
    execute: (args) => deps.forget(args),
  });
  child.tools?.register({
    name: 'memory_stats',
    description: 'Report note counts, index usage and store health issues.',
    parameters: object({}),
    execute: () => deps.stats(),
  });
}
