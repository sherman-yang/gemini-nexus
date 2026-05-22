import { CONNECTION_STORAGE_KEYS } from '../../shared/settings/connection.js';
import {
    createInitialRestoreMessages,
    createLocalStorageRestoreMessages,
} from './state_messages.js';

export function getOwnerTabIdFromLocation(locationLike = window.location) {
    try {
        const url = new URL(locationLike.href);
        const tabId = Number.parseInt(url.searchParams.get('tabId'), 10);
        return Number.isInteger(tabId) && tabId > 0 ? tabId : null;
    } catch {
        return null;
    }
}

export class StateManager {
    constructor(frameManager) {
        this.frame = frameManager;
        this.data = null; // Pre-fetched data cache
        this.sessionData = null;
        this.ownerTabId = getOwnerTabIdFromLocation();
        this.currentTabId = this.ownerTabId ?? undefined;
        this.uiIsReady = false;
        this.hasInitialized = false;
    }

    init() {
        // Start fetching bulk data immediately
        chrome.storage.local.get(
            [
                'geminiSessions',
                'pendingSessionId',
                'pendingMode', // Fetch pending mode (e.g. browser_control)
                'geminiShortcuts',
                'pendingImage',
                'geminiSidebarBehavior',
                'geminiSidePanelScope',
                'geminiTextSelectionEnabled',
                'geminiTextSelectionBlacklist',
                'geminiImageToolsEnabled',
                'geminiAccountIndices',
                ...CONNECTION_STORAGE_KEYS,
                'geminiContextMode',
                'geminiContextRecentTurns',
            ],
            (result) => {
                this.data = result;
                this.trySendInitData();
            }
        );

        chrome.storage.session.get(['geminiSidePanelSessionBindings'], (result) => {
            this.sessionData = result;
            this.trySendInitData();
        });

        if (this.hasFixedTabContext()) {
            this.trySendInitData();
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                this.currentTabId = tabs && tabs[0] ? tabs[0].id : null;
                this.trySendInitData();
            });
        }

        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'session' && changes.geminiSidePanelSessionBindings) {
                this.sessionData = {
                    geminiSidePanelSessionBindings:
                        changes.geminiSidePanelSessionBindings.newValue || {},
                };
                this.postCurrentTabContext();
                return;
            }

            if (areaName === 'local') {
                this.syncLocalStorageChanges(changes);
            }
        });

        chrome.tabs.onActivated.addListener(({ tabId }) => {
            if (this.hasFixedTabContext()) return;

            this.currentTabId = tabId || null;
            this.postCurrentTabContext();
        });

        chrome.tabs.onRemoved.addListener((tabId) => {
            this.removeSessionBinding(tabId);

            if (this.ownerTabId === tabId) {
                this.currentTabId = null;
                this.postCurrentTabContext();
                return;
            }

            if (this.hasFixedTabContext()) return;

            if (this.currentTabId === tabId) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    this.currentTabId = tabs && tabs[0] ? tabs[0].id : null;
                    this.postCurrentTabContext();
                });
            }
        });

        // Safety Timeout: Force reveal if handshake fails
        setTimeout(() => {
            if (!this.uiIsReady) {
                console.warn('UI_READY signal timeout, forcing skeleton removal');
                this.frame.reveal();
            }
        }, 1000);
    }

    markUiReady() {
        this.uiIsReady = true;
        this.trySendInitData();
    }

    trySendInitData() {
        // Only proceed if we have data AND the UI has signaled readiness
        // (Or if we can detect the window exists, though UI_READY is safer for logic)
        if (
            (!this.uiIsReady && !this.hasInitialized) ||
            !this.data ||
            this.sessionData === null ||
            this.currentTabId === undefined
        )
            return;

        this.hasInitialized = true;
        this.frame.reveal();

        const frameWindow = this.frame.getWindow();
        if (!frameWindow) return;

        const restoreMessages = createInitialRestoreMessages(this.data, {
            theme: localStorage.getItem('geminiTheme') || 'system',
            language: localStorage.getItem('geminiLanguage') || 'system',
            appVersion: `v${chrome.runtime.getManifest().version}`,
        });

        restoreMessages.beforeTabContext.forEach((message) => this.frame.postMessage(message));
        this.postCurrentTabContext();
        restoreMessages.afterTabContext.forEach((message) => this.frame.postMessage(message));

        // Replay deferred actions captured before the side panel was ready.
        if (this.data.pendingSessionId) {
            this.frame.postMessage({
                action: 'BACKGROUND_MESSAGE',
                payload: { action: 'SWITCH_SESSION', sessionId: this.data.pendingSessionId },
            });
            chrome.storage.local.remove('pendingSessionId');
            delete this.data.pendingSessionId;
        }

        if (this.data.pendingImage) {
            this.frame.postMessage({
                action: 'BACKGROUND_MESSAGE',
                payload: this.data.pendingImage,
            });
            chrome.storage.local.remove('pendingImage');
            delete this.data.pendingImage;
        }

        if (this.data.pendingMode === 'browser_control') {
            this.frame.postMessage({
                action: 'BACKGROUND_MESSAGE',
                payload: { action: 'ACTIVATE_BROWSER_CONTROL' },
            });
            chrome.storage.local.remove('pendingMode');
            delete this.data.pendingMode;
        }

        restoreMessages.afterPendingActions.forEach((message) => this.frame.postMessage(message));
    }

    syncLocalStorageChanges(changes) {
        if (!this.data) return;

        const changedKeys = Object.keys(changes);
        for (const key of changedKeys) {
            const newValue = changes[key].newValue;
            if (newValue === undefined) delete this.data[key];
            else this.data[key] = newValue;
        }

        if (!this.hasInitialized) return;

        if (Object.prototype.hasOwnProperty.call(changes, 'geminiTheme')) {
            localStorage.setItem('geminiTheme', this.data.geminiTheme || 'system');
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'geminiLanguage')) {
            localStorage.setItem('geminiLanguage', this.data.geminiLanguage || 'system');
        }

        createLocalStorageRestoreMessages(this.data, changedKeys).forEach((message) =>
            this.frame.postMessage(message)
        );
    }

    updateSessions(sessions) {
        if (this.data) this.data.geminiSessions = sessions;
        // Note: No need to save to storage here, usually comes from background broadcast
    }

    save(key, value) {
        if (this.data) this.data[key] = value;

        const update = {};
        update[key] = value;
        chrome.storage.local.set(update);

        if (key === 'geminiTheme') localStorage.setItem('geminiTheme', value);
        if (key === 'geminiLanguage') localStorage.setItem('geminiLanguage', value);
    }

    getCurrentTabId() {
        return this.currentTabId;
    }

    hasFixedTabContext() {
        return Number.isInteger(this.ownerTabId) && this.ownerTabId > 0;
    }

    getSessionBindings() {
        return this.sessionData?.geminiSidePanelSessionBindings || {};
    }

    postCurrentTabContext() {
        if (!this.hasInitialized) return;
        if (!this.frame.getWindow()) return;

        const sessionBindings = this.getSessionBindings();
        const boundSessionId = this.currentTabId
            ? sessionBindings[this.currentTabId] || null
            : null;

        this.frame.postMessage({
            action: 'RESTORE_SIDE_PANEL_TAB_CONTEXT',
            payload: {
                tabId: this.currentTabId,
                sessionId: boundSessionId,
            },
        });
    }

    removeSessionBinding(tabId) {
        if (!Number.isInteger(tabId) || tabId <= 0) return;

        const sessionBindings = this.getSessionBindings();
        if (!Object.prototype.hasOwnProperty.call(sessionBindings, tabId)) return;

        const nextBindings = { ...sessionBindings };
        delete nextBindings[tabId];
        this.sessionData = { geminiSidePanelSessionBindings: nextBindings };
        chrome.storage.session.set({ geminiSidePanelSessionBindings: nextBindings });
    }
}
