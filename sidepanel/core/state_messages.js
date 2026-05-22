import {
    DEFAULT_CONTEXT_MODE,
    DEFAULT_CONTEXT_RECENT_TURNS,
    DEFAULT_SIDE_PANEL_SCOPE,
} from '../../shared/config/constants.js';
import {
    CONNECTION_STORAGE_KEYS,
    createConnectionSettingsPayload,
} from '../../shared/settings/connection.js';

export const CONNECTION_STORAGE_KEY_SET = new Set(CONNECTION_STORAGE_KEYS);

export function createConnectionRestoreMessage(data) {
    return {
        action: 'RESTORE_CONNECTION_SETTINGS',
        payload: createConnectionSettingsPayload(data),
    };
}

export function createContextRestorePayload(data) {
    return {
        mode: data.geminiContextMode || DEFAULT_CONTEXT_MODE,
        recentTurns: data.geminiContextRecentTurns || DEFAULT_CONTEXT_RECENT_TURNS,
    };
}

export function createInitialRestoreMessages(data, { theme, language, appVersion }) {
    const connectionSettings = createConnectionSettingsPayload(data);

    return {
        beforeTabContext: [
            {
                action: 'RESTORE_CONNECTION_SETTINGS',
                payload: connectionSettings,
            },
            {
                action: 'RESTORE_SIDEBAR_BEHAVIOR',
                payload: data.geminiSidebarBehavior || 'auto',
            },
            {
                action: 'RESTORE_CONTEXT_SETTINGS',
                payload: createContextRestorePayload(data),
            },
            {
                action: 'RESTORE_SIDE_PANEL_SCOPE',
                payload: data.geminiSidePanelScope || DEFAULT_SIDE_PANEL_SCOPE,
            },
        ],
        afterTabContext: [
            {
                action: 'RESTORE_SESSIONS',
                payload: data.geminiSessions || [],
            },
            {
                action: 'RESTORE_SHORTCUTS',
                payload: data.geminiShortcuts || null,
            },
            { action: 'RESTORE_MODEL', payload: connectionSettings.selectedModel },
            {
                action: 'RESTORE_TEXT_SELECTION',
                payload: data.geminiTextSelectionEnabled !== false,
            },
            {
                action: 'RESTORE_TEXT_SELECTION_BLACKLIST',
                payload: data.geminiTextSelectionBlacklist || '',
            },
            {
                action: 'RESTORE_IMAGE_TOOLS',
                payload: data.geminiImageToolsEnabled !== false,
            },
            {
                action: 'RESTORE_ACCOUNT_INDICES',
                payload: data.geminiAccountIndices || '0',
            },
            {
                action: 'RESTORE_APP_VERSION',
                payload: appVersion,
            },
        ],
        afterPendingActions: [
            { action: 'RESTORE_LANGUAGE', payload: language },
            { action: 'RESTORE_THEME', payload: theme },
        ],
    };
}

export function createLocalStorageRestoreMessages(data, changedKeys) {
    const hasChanged = (key) => changedKeys.includes(key);
    const messages = [];

    if (hasChanged('geminiShortcuts')) {
        messages.push({
            action: 'RESTORE_SHORTCUTS',
            payload: data.geminiShortcuts || null,
        });
    }

    if (hasChanged('geminiTheme')) {
        messages.push({ action: 'RESTORE_THEME', payload: data.geminiTheme || 'system' });
    }

    if (hasChanged('geminiLanguage')) {
        messages.push({ action: 'RESTORE_LANGUAGE', payload: data.geminiLanguage || 'system' });
    }

    if (hasChanged('geminiSidebarBehavior')) {
        messages.push({
            action: 'RESTORE_SIDEBAR_BEHAVIOR',
            payload: data.geminiSidebarBehavior || 'auto',
        });
    }

    if (hasChanged('geminiSidePanelScope')) {
        messages.push({
            action: 'RESTORE_SIDE_PANEL_SCOPE',
            payload: data.geminiSidePanelScope || DEFAULT_SIDE_PANEL_SCOPE,
        });
    }

    if (hasChanged('geminiContextMode') || hasChanged('geminiContextRecentTurns')) {
        messages.push({
            action: 'RESTORE_CONTEXT_SETTINGS',
            payload: createContextRestorePayload(data),
        });
    }

    if (hasChanged('geminiTextSelectionEnabled')) {
        messages.push({
            action: 'RESTORE_TEXT_SELECTION',
            payload: data.geminiTextSelectionEnabled !== false,
        });
    }

    if (hasChanged('geminiTextSelectionBlacklist')) {
        messages.push({
            action: 'RESTORE_TEXT_SELECTION_BLACKLIST',
            payload: data.geminiTextSelectionBlacklist || '',
        });
    }

    if (hasChanged('geminiImageToolsEnabled')) {
        messages.push({
            action: 'RESTORE_IMAGE_TOOLS',
            payload: data.geminiImageToolsEnabled !== false,
        });
    }

    if (hasChanged('geminiAccountIndices')) {
        messages.push({
            action: 'RESTORE_ACCOUNT_INDICES',
            payload: data.geminiAccountIndices || '0',
        });
    }

    if (changedKeys.some((key) => CONNECTION_STORAGE_KEY_SET.has(key))) {
        messages.push(createConnectionRestoreMessage(data));
    }

    return messages;
}
