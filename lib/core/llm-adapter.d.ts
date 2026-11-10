export interface LlmRequest {
    system: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    tools?: readonly unknown[];
}
export interface LlmResult {
    text: string;
}
/** Implemented by the host layer; the core never owns credentials or a client. */
export interface LlmAdapter {
    complete(request: LlmRequest): Promise<LlmResult>;
}
export declare const disabledLlm: LlmAdapter;
export declare function isBudgetError(error: unknown): boolean;
