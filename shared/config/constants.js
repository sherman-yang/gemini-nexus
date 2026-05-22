export const DEFAULT_SHORTCUTS = {
    quickAsk: 'Ctrl+G',
    openPanel: 'Alt+S',
    browserControl: 'Ctrl+B',
    ocrCapture: 'Alt+O',
};

export const DEFAULT_PROVIDER = 'web';
export const DEFAULT_STORED_GEMINI_MODEL = '8c46e95b1a07cecc';
export const DEFAULT_OFFICIAL_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_OFFICIAL_MODELS = 'gemini-3-flash-preview, gemini-3.1-pro-preview';
export const DEFAULT_OFFICIAL_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_OPENAI_MODEL = 'openai_custom';
export const DEFAULT_THINKING_LEVEL = 'low';
export const DEFAULT_CONTEXT_MODE = 'summary';
export const DEFAULT_CONTEXT_RECENT_TURNS = 10;
export const CONTEXT_RECENT_TURNS_LIMITS = Object.freeze({
    MIN: 1,
    MAX: 50,
    DEFAULT: DEFAULT_CONTEXT_RECENT_TURNS,
});
export const DEFAULT_SIDE_PANEL_SCOPE = 'remembered_tabs';
export const DEFAULT_MCP_TRANSPORT = 'streamable-http';
export const DEFAULT_MCP_HTTP_URL = 'http://127.0.0.1:3006/mcp';
export const DEFAULT_MCP_SSE_URL = 'http://127.0.0.1:3006/sse';
export const DEFAULT_MCP_WS_URL = 'ws://127.0.0.1:3006/mcp';

export function normalizeContextRecentTurns(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return CONTEXT_RECENT_TURNS_LIMITS.DEFAULT;

    return Math.min(
        CONTEXT_RECENT_TURNS_LIMITS.MAX,
        Math.max(CONTEXT_RECENT_TURNS_LIMITS.MIN, parsed)
    );
}
