import type { DshContext } from './contracts.js';

export const PROMPT_SECTION = 'companion:memory';

/** Stable section, refreshed only when the bounded index changes. */
export function mountPrompt(child: DshContext, getSnapshot: () => string): void {
  child.systemPrompt?.context({
    name: PROMPT_SECTION,
    order: 130,
    text: getSnapshot,
    interpolate: false,
  });
}
