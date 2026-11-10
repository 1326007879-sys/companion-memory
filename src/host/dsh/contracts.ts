/**
 * Minimal structural view of the harness. Declaring it locally avoids a
 * build-time dependency on @deepseek-ai/* type packages; tighten these shapes
 * against the real Cordis types when wiring the plugin.
 */
export interface DshSession {
  id: string;
  firstLiveSeq: number;
}

export interface DshSessionEvent {
  seq: number;
  time: number;
  type: string;
  surfaceOp?: string;
  sourceEventSeqs?: unknown;
  data?: Record<string, unknown>;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface PromptSpec {
  name: string;
  order: number;
  text: () => string;
  interpolate: boolean;
}

export interface DshContext {
  on(event: string, handler: (...args: any[]) => unknown): () => void;
  get?(name: string): unknown;
  provide?(name: string, value: unknown): void;
  plugin?(descriptor: { name: string; apply: (ctx: DshContext) => void }): void;
  systemPrompt?: { context(spec: PromptSpec): void };
  tools?: { register(spec: ToolSpec): void };
  llm?: { stream?: unknown };
}
