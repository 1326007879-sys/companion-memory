import type { DshContext } from './contracts.js';
export declare const PROMPT_SECTION = "companion:memory";
/** Stable section, refreshed only when the bounded index changes. */
export declare function mountPrompt(child: DshContext, getSnapshot: () => string): void;
