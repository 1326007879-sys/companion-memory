import { disabledLlm } from '../../core/index.js';
/**
 * v0 skeleton: review is disabled by default. The real adapter must route
 * through the host `llm/stream` chain so credentials and the money budget stay
 * with the harness, and must never open its own API client.
 */
export function createDshLlmAdapter(_ctx) {
    return disabledLlm;
}
