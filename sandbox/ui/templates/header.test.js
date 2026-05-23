// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { HeaderTemplate } from './header.js';

describe('HeaderTemplate', () => {
    it('keeps the standalone chat launcher visible as a normal header action', () => {
        document.body.innerHTML = HeaderTemplate;

        const launcher = document.getElementById('open-full-page-btn');
        const headerRight = document.querySelector('.header-right');

        expect(launcher).not.toBeNull();
        expect(headerRight.contains(launcher)).toBe(true);
        expect(launcher.classList.contains('icon-btn')).toBe(true);
        expect(launcher.classList.contains('corner-btn')).toBe(false);
        expect(launcher.getAttribute('data-i18n-title')).toBe('openFullPageTooltip');
    });

    it('renders an AMC-style custom model picker around the native model select', () => {
        document.body.innerHTML = HeaderTemplate;

        const wrapper = document.querySelector('.model-select-wrapper');
        const nativeSelect = document.getElementById('model-select');
        const trigger = document.getElementById('model-picker-trigger');
        const menu = document.getElementById('model-picker-menu');
        const listbox = document.getElementById('model-picker-listbox');

        expect(wrapper.contains(nativeSelect)).toBe(true);
        expect(nativeSelect.classList.contains('model-native-select')).toBe(true);
        expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(trigger.querySelector('.model-picker-current')).not.toBeNull();
        expect(trigger.querySelector('.model-picker-current').textContent).toBe('3.1 Flash-Lite');
        expect(trigger.querySelectorAll('svg')).toHaveLength(0);
        expect(menu.hidden).toBe(true);
        expect(listbox.getAttribute('role')).toBe('listbox');
    });
});
