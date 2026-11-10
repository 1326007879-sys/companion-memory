export declare const PANEL_ID = "companion-memory";
export declare const TOOL_NAMES: readonly ["memory_recall", "memory_read", "memory_save", "memory_forget", "memory_stats"];
interface ClientSlots {
    inject(name: string, factory: () => unknown): unknown;
    register(spec: Record<string, unknown>): unknown;
}
export interface ClientContext {
    slots?: ClientSlots;
    get?(name: string): unknown;
}
/**
 * Registers a read-only sidebar entry through the host's slot service.
 *
 * The host renders `sidebar.footer.action` itself, so no React runtime or
 * network client is added to this package. Full note browsing stays on the
 * tool surface (`memory_stats` / `memory_recall` / `memory_read`); a custom
 * pane with its own component would require a host-side remote RPC group.
 * Registration is best-effort: a missing slot service must never break boot.
 */
export declare function mountPanel(client: ClientContext): boolean;
export {};
