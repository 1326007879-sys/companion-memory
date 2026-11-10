export interface SummaryItem {
    memoryId: string;
    revision: number;
    summary: string;
    availableLayers: ['refined', 'raw'];
}
export interface DisclosureCandidate {
    memoryId: string;
    revision: number;
    summary: string;
    detailsUnavailable?: boolean;
}
export declare function estimateTokens(value: unknown): number;
/** Summaries are the only layer that enters the prompt; details are fetched on demand. */
export declare function summaryItems(memories: readonly DisclosureCandidate[], tokenBudget: number, maxItems?: number): SummaryItem[];
/** Raw pages never truncate a source in the middle. */
export declare function rawPage<T>(sources: readonly T[], offset?: number, pageSize?: number): {
    sources: T[];
    nextOffset?: number;
};
