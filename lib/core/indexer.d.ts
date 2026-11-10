/** English words plus Chinese character bigrams; no external tokenizer. */
export declare function featuresOf(text: string): string[];
export interface KeywordIndex {
    docCount: number;
    df: Record<string, number>;
    postings: Record<string, string[]>;
}
export declare function buildKeywordIndex(docs: Array<{
    id: string;
    text: string;
}>): KeywordIndex;
export declare function idf(term: string, index: KeywordIndex): number;
/** IDF-weighted feature overlap, normalized so long notes cannot dominate. */
export declare function relevance(query: string, text: string, index: KeywordIndex): number;
