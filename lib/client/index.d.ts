import { type ClientContext } from './panel.js';
/** Client-side Cordis plugin entry, discovered via exports["./client"]. */
declare const _default: {
    name: string;
    apply(ctx: ClientContext): void;
};
export default _default;
export { mountPanel, PANEL_ID, TOOL_NAMES, type ClientContext } from './panel.js';
