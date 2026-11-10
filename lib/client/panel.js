export const PANEL_ID = 'companion-memory';
export const TOOL_NAMES = [
    'memory_recall',
    'memory_read',
    'memory_save',
    'memory_forget',
    'memory_stats',
];
/**
 * Registers a read-only sidebar entry through the host's slot service.
 *
 * The host renders `sidebar.footer.action` itself, so no React runtime or
 * network client is added to this package. Full note browsing stays on the
 * tool surface (`memory_stats` / `memory_recall` / `memory_read`); a custom
 * pane with its own component would require a host-side remote RPC group.
 * Registration is best-effort: a missing slot service must never break boot.
 */
export function mountPanel(client) {
    const slots = client.slots;
    if (typeof slots?.inject !== 'function' || typeof slots.register !== 'function')
        return false;
    try {
        slots.inject('sidebar.footer.action', () => slots.register({
            name: 'sidebar.footer.action',
            id: PANEL_ID,
            inject: () => ({
                readOnly: true,
                toolNames: [...TOOL_NAMES],
            }),
        }));
        return true;
    }
    catch {
        return false;
    }
}
