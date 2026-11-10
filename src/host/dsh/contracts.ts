/**
 * Structural view of the harness, aligned with the declarations embedded in
 * the desktop build (`dsh/node_modules/@deepseek-ai/*\/lib/typert.host.js`).
 *
 * The host packages ship no `.d.ts` in the desktop bundle (their types live in
 * JSDoc and typert declarations), so these shapes stay local on purpose: the
 * core remains buildable without any `@deepseek-ai/*` dependency, while the dsh
 * layer matches the real runtime. Verified against desktop 0.2.2-rc.1.
 *
 * Real shapes:
 *   class Session { get id(): SessionId; readonly firstLiveSeq: SessionLogOffset; get seq(): SessionLogOffset; ... }
 *   type SessionEvent<T> = { type: K; seq: SessionSeq; time: number; data: SessionEventMap[K]; ignorable?: true }
 *     & (K extends SurfaceEventType ? SurfaceIntent<K> : { surfaceOp?: never; sourceEventSeqs?: never })
 *   type SurfaceIntent<T> = { surfaceOp: SurfaceOp }
 *     & (T extends 'assistant/message' ? { sourceEventSeqs?: never } : { sourceEventSeqs?: SessionSeq[] })
 */
export interface DshSession {
  id: string;
  firstLiveSeq: number;
  seq?: number;
}

export interface DshSessionEvent {
  seq: number;
  time: number;
  type: string;
  data?: Record<string, unknown>;
  /** Top-level on surface events; `ignorable` events must never be archived. */
  surfaceOp?: string;
  sourceEventSeqs?: unknown;
  ignorable?: true;
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
  /** The host calls `text(context)` when a function is supplied. */
  text: string | ((context?: unknown) => string);
  interpolate: boolean;
}

export interface DshContext {
  on(event: string, handler: (...args: any[]) => unknown): () => void;
  /** `agent/created` is dispatched as a serial lifecycle event. */
  serial?(carrier: unknown, event: string, payload: unknown): Promise<unknown> | unknown;
  /** `llm/stream` is a waterfall, not a plain service method. */
  waterfall?(carrier: unknown, event: string, options: unknown, next: () => unknown): unknown;
  get?(name: string): unknown;
  provide?(name: string, value: unknown): void;
  plugin?(descriptor: { name: string; apply: (ctx: DshContext) => void }): void;
  systemPrompt?: { context(spec: PromptSpec): void };
  tools?: { register(spec: ToolSpec): void };
  llm?: { stream?: unknown };
}
