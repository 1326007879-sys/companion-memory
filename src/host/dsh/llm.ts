import type { LlmAdapter, LlmRequest, LlmResult } from '../../core/index.js';
import type { DshContext, DshLlmStreamChunk } from './contracts.js';

export interface ModelRoute {
  provider: string;
  model: string;
}

export interface LlmAdapterOptions {
  /** Explicit override; when both are set the current session route is ignored. */
  provider?: string;
  model?: string;
  /** Fallback: the model used by the most recent agent request. */
  route?: () => ModelRoute | undefined;
}

/**
 * Borrows the host's configured model through `ctx.llm.stream(options)`.
 * No API key, no network client and no provider fallback live in this package;
 * `llm/stream` waterfall listeners belong to the host runtime, not to us.
 */
export function createDshLlmAdapter(ctx: DshContext, options: LlmAdapterOptions = {}): LlmAdapter {
  return {
    async complete(request: LlmRequest): Promise<LlmResult> {
      const llm = ctx.llm;
      if (typeof llm?.stream !== 'function') throw new Error('llm service is not mounted');

      const provider = options.provider?.trim();
      const model = options.model?.trim();
      const configured = provider && model ? { provider, model } : undefined;
      const route = configured ?? options.route?.();
      if (!route?.provider || !route.model) {
        throw new Error('no model route: set reviewProvider/reviewModel or wait for a chat request header');
      }

      const generateOptions = {
        provider: route.provider,
        model: route.model,
        system: request.system,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: [{ type: 'text', text: message.content }],
        })),
        temperature: 0,
      };

      let text = '';
      let finished = false;
      for await (const chunk of llm.stream(generateOptions)) {
        const item = chunk as DshLlmStreamChunk;
        if (item?.type === 'text-delta') text += item.text ?? item.delta ?? '';
        if (item?.type === 'finish') {
          finished = true;
          const kind = item.reason?.kind;
          if (kind === 'error' || kind === 'aborted') {
            const failure = item.reason?.failure;
            const error = new Error(`llm stream ${kind}: ${failure?.code ?? ''} ${failure?.message ?? ''}`.trim());
            if (failure?.code) (error as { code?: string }).code = failure.code;
            throw error;
          }
        }
      }
      if (!finished) throw new Error('llm stream ended without a terminal finish chunk');
      return { text };
    },
  };
}
