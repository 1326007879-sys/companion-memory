import { mountPanel } from './panel.js';
/** Client-side Cordis plugin entry, discovered via exports["./client"]. */
export default {
    name: 'dsh-companion-memory-client',
    apply(ctx) {
        mountPanel(ctx);
    },
};
export { mountPanel, PANEL_ID, TOOL_NAMES } from './panel.js';
