export interface LlmRequest {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  tools?: readonly unknown[];
}

export interface LlmResult {
  text: string;
}

/** Implemented by the host layer; the core never owns credentials or a client. */
export interface LlmAdapter {
  complete(request: LlmRequest): Promise<LlmResult>;
}

export const disabledLlm: LlmAdapter = {
  async complete() {
    throw new Error('LLM adapter is disabled (maintenanceMode: off)');
  },
};

export function isBudgetError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'MONEY_BUDGET_EXCEEDED';
}
