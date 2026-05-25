import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./content_injection.js', () => ({
    injectContentScriptsIntoTab: vi.fn(),
}));

import { injectContentScriptsIntoTab } from './content_injection.js';
import { setupContextMenus } from './menus.js';

describe('context menu actions', () => {
    let clickListener;

    beforeEach(() => {
        vi.clearAllMocks();
        clickListener = null;
        globalThis.chrome = {
            i18n: {
                getUILanguage: vi.fn(() => 'en-US'),
            },
            runtime: {
                lastError: null,
            },
            contextMenus: {
                create: vi.fn((item, callback) => callback?.()),
                removeAll: vi.fn((callback) => callback?.()),
                onClicked: {
                    addListener: vi.fn((listener) => {
                        clickListener = listener;
                    }),
                },
            },
            scripting: {
                executeScript: vi.fn(() => Promise.resolve()),
            },
            tabs: {
                sendMessage: vi.fn(() => Promise.resolve({ status: 'ok' })),
            },
        };
    });

    it('limits menu visibility to web pages', () => {
        setupContextMenus();
        const createdItems = chrome.contextMenus.create.mock.calls.map(([item]) => item);

        expect(createdItems.every((item) => item.documentUrlPatterns?.includes('http://*/*'))).toBe(
            true
        );
        expect(
            createdItems.every((item) => item.documentUrlPatterns?.includes('https://*/*'))
        ).toBe(true);
    });

    it('injects missing content scripts before dispatching a context menu action', async () => {
        setupContextMenus();
        injectContentScriptsIntoTab.mockResolvedValue({ status: 'injected' });

        await clickListener({ menuItemId: 'menu-ask' }, { id: 7, url: 'https://example.test/' });

        expect(injectContentScriptsIntoTab).toHaveBeenCalledWith({
            id: 7,
            url: 'https://example.test/',
        });
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, {
            action: 'CONTEXT_MENU_ACTION',
            mode: 'ask',
        });
    });

    it('creates page and selection reading context menu entries', () => {
        setupContextMenus();
        const createdItems = chrome.contextMenus.create.mock.calls.map(([item]) => item);
        const readPage = createdItems.find((item) => item.id === 'menu-read-page');
        const readSelection = createdItems.find((item) => item.id === 'menu-read-selection');

        expect(readPage).toEqual(
            expect.objectContaining({
                title: 'Read page aloud',
                contexts: ['all'],
            })
        );
        expect(readSelection).toEqual(
            expect.objectContaining({
                title: 'Read selection aloud',
                contexts: ['selection'],
            })
        );
    });

    it('shows an in-page failure notice when a context menu action cannot reach content scripts', async () => {
        setupContextMenus();
        injectContentScriptsIntoTab.mockResolvedValue({ status: 'failed' });

        await clickListener({ menuItemId: 'menu-ask' }, { id: 7, url: 'https://example.test/' });

        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
            target: { tabId: 7 },
            func: expect.any(Function),
            args: [expect.stringContaining('Gemini Nexus')],
        });
    });
});
