// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

async function installToolbarIcons() {
    await import('./icons.js');
}

describe('GeminiToolbarIcons', () => {
    beforeEach(async () => {
        vi.resetModules();
        globalThis.chrome = {
            runtime: {
                getURL: vi.fn((path) => `chrome-extension://id/${path}`),
            },
        };
        await installToolbarIcons();
    });

    it('keeps the logo icon presentation in CSS instead of inline styles', () => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = window.GeminiToolbarIcons.LOGO;
        const logo = wrapper.querySelector('img');

        expect(logo).not.toBeNull();
        expect(logo.getAttribute('src')).toBe('chrome-extension://id/logo.png');
        expect(logo.classList.contains('toolbar-logo')).toBe(true);
        expect(logo.hasAttribute('style')).toBe(false);
    });
});
