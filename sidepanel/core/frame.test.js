// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameManager } from './frame.js';

describe('FrameManager', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="skeleton"></div>
            <iframe id="sandbox-frame"></iframe>
        `;
        localStorage.clear();
        globalThis.chrome = {
            runtime: {
                getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
            },
        };
    });

    it('loads the sandbox iframe with an absolute extension URL', () => {
        localStorage.setItem('geminiTheme', 'dark');
        localStorage.setItem('geminiLanguage', 'zh-CN');

        const manager = new FrameManager();
        manager.init();

        expect(chrome.runtime.getURL).toHaveBeenCalledWith(
            'sandbox/index.html?theme=dark&lang=zh-CN'
        );
        expect(document.getElementById('sandbox-frame').src).toBe(
            'chrome-extension://test-id/sandbox/index.html?theme=dark&lang=zh-CN'
        );
    });

    it('passes the cached sidebar expanded state to the sandbox URL', () => {
        localStorage.setItem('geminiTheme', 'dark');
        localStorage.setItem('geminiLanguage', 'zh-CN');
        localStorage.setItem('geminiSidebarExpanded', 'false');

        const manager = new FrameManager();
        manager.init();

        expect(chrome.runtime.getURL).toHaveBeenCalledWith(
            'sandbox/index.html?theme=dark&lang=zh-CN&sidebarExpanded=false'
        );
    });

    it('falls back to the local sandbox URL when chrome.runtime is unavailable', () => {
        delete globalThis.chrome;
        localStorage.setItem('geminiTheme', 'light');
        localStorage.setItem('geminiLanguage', 'en');

        const manager = new FrameManager();
        manager.init();

        expect(document.getElementById('sandbox-frame').src).toBe(
            'http://localhost:3000/sandbox/index.html?theme=light&lang=en'
        );
    });
});
