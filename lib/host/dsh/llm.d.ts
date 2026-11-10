import { type LlmAdapter } from '../../core/index.js';
import type { DshContext } from './contracts.js';
/**
 * v0 skeleton: review is disabled by default. The real adapter must route
 * through the host `llm/stream` chain so credentials and the money budget stay
 * with the harness, and must never open its own API client.
 */
export declare function createDshLlmAdapter(_ctx: DshContext): LlmAdapter;
