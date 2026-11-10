import { mountPanel, type ClientContext } from './panel.js';

/** Client-side Cordis plugin entry, discovered via exports["./client"]. */
export default {
  name: 'dsh-companion-memory-client',
  apply(ctx: ClientContext): void {
    mountPanel(ctx);
  },
};

export { mountPanel, PANEL_ID, TOOL_NAMES, type ClientContext } from './panel.js';
