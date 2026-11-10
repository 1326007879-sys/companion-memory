export declare const PANEL_ID = "companion-memory";
export interface PanelDeps {
    listNotes(): Promise<Array<{
        id: string;
        name: string;
        type: string;
        bytes: number;
    }>>;
    readNote(id: string): Promise<string>;
    forget(id: string): Promise<void>;
    stats(): Promise<{
        notes: number;
        indexLines: number;
        indexBytes: number;
        issues: string[];
    }>;
}
/**
 * v0 skeleton. The real sidebar slot is registered with the `dsh.client`
 * injection API when the client contract is confirmed; the panel is read-only
 * and all writes go through the tools.
 */
export declare function mountPanel(_client: unknown, _deps: PanelDeps): void;
