// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { SidebarTemplate } from './sidebar.js';

describe('SidebarTemplate', () => {
    it('renders an AMC-style sidebar shell with a header, actions, history, and footer', () => {
        document.body.innerHTML = SidebarTemplate;

        const sidebar = document.getElementById('history-sidebar');
        const expandedPane = sidebar.querySelector('.sidebar-expanded-pane');
        const collapsedRail = sidebar.querySelector('.collapsed-sidebar-rail');
        const header = expandedPane.querySelector('.sidebar-header');
        const actions = sidebar.querySelector('.sidebar-actions');
        const historySection = sidebar.querySelector('.sidebar-history');

        expect(header.querySelector('#close-sidebar.sidebar-toggle-btn')).not.toBeNull();
        expect(actions.querySelector('#new-chat-sidebar-btn')).not.toBeNull();
        expect(actions.querySelector('#sidebar-search-toggle')).not.toBeNull();

        const searchPanel = actions.querySelector('.search-container');
        expect(searchPanel.hasAttribute('hidden')).toBe(true);
        expect(searchPanel.querySelector('#history-search')).not.toBeNull();
        expect(searchPanel.querySelector('#history-search-clear')).not.toBeNull();

        expect(historySection.querySelector('.history-list-label').getAttribute('data-i18n')).toBe(
            'recentLabel'
        );
        expect(historySection.querySelector('#history-list')).not.toBeNull();
        expect(sidebar.querySelector('.sidebar-footer #settings-btn')).not.toBeNull();

        expect(collapsedRail.querySelector('#collapsed-sidebar-toggle')).not.toBeNull();
        expect(collapsedRail.querySelector('#collapsed-new-chat-btn')).not.toBeNull();
        expect(collapsedRail.querySelector('#collapsed-search-btn')).not.toBeNull();
        expect(collapsedRail.querySelector('#collapsed-recent-chats-btn')).not.toBeNull();
        expect(collapsedRail.querySelector('#collapsed-settings-btn')).not.toBeNull();

        const recentPopover = sidebar.querySelector('#collapsed-recent-popover');
        expect(recentPopover).not.toBeNull();
        expect(recentPopover.className).toContain('collapsed-recent-popover');
        expect(recentPopover.hasAttribute('hidden')).toBe(true);
    });
});
