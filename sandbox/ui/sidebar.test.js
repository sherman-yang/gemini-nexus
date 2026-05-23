// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarController } from './sidebar.js';

const messagingMocks = vi.hoisted(() => ({
    requestSidebarExpandedFromStorage: vi.fn(),
    saveSidebarExpandedToStorage: vi.fn(),
}));

vi.mock('../../shared/messaging/index.js', () => messagingMocks);

vi.mock('../core/i18n.js', () => ({
    t: (key) =>
        ({
            noConversations: 'No conversations yet.',
            delete: 'Delete',
            deleteChatConfirm: 'Delete this chat?',
            generating: 'Generating',
            moreOptions: 'More options',
            recentChats: 'Recent chats',
        })[key] || key,
}));

describe('SidebarController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState(null, '', '/sandbox/index.html');
        document.body.className = '';
        localStorage.clear();
        document.body.innerHTML = `
            <button id="sidebar-search-toggle"></button>
            <div class="search-container" hidden>
                <input id="history-search">
                <button id="history-search-clear"></button>
            </div>
            <div class="collapsed-sidebar-rail">
                <button id="collapsed-sidebar-toggle"></button>
                <button id="collapsed-search-btn"></button>
                <button id="collapsed-recent-chats-btn"></button>
                <div class="collapsed-sidebar-spacer"></div>
            </div>
            <div id="collapsed-recent-popover" hidden></div>
            <div class="sidebar-history">
                <div id="history-list"></div>
            </div>
        `;
    });

    it('uses the shared empty state class without inline styles', () => {
        const listEl = document.getElementById('history-list');
        const controller = new SidebarController(
            {
                historyListEl: listEl,
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList([], null, {}, {});

        const empty = listEl.querySelector('.empty-list-state');
        expect(empty).toBeTruthy();
        expect(empty.textContent).toBe('No conversations yet.');
        expect(empty.hasAttribute('style')).toBe(false);
    });

    it('opens the AMC-style search panel from the sidebar search action', () => {
        const controller = new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        document.getElementById('sidebar-search-toggle').click();

        expect(document.querySelector('.search-container').hidden).toBe(false);
        expect(document.body.classList.contains('sidebar-search-open')).toBe(true);
        expect(document.activeElement).toBe(document.getElementById('history-search'));
        controller.closeSearch();
    });

    it('expands the wide collapsed rail before opening search', () => {
        document.body.classList.add('layout-wide', 'sidebar-collapsed');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar collapsed';

        new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        document.getElementById('sidebar-search-toggle').click();

        expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);
        expect(sidebar.classList.contains('collapsed')).toBe(false);
        expect(document.querySelector('.search-container').hidden).toBe(false);
    });

    it('clears search and restores the full conversation list from the clear button', () => {
        const listEl = document.getElementById('history-list');
        const controller = new SidebarController(
            {
                historyListEl: listEl,
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [
                { id: 'alpha', title: 'Alpha chat', messages: [] },
                { id: 'beta', title: 'Beta chat', messages: [] },
            ],
            null,
            { onSwitch: vi.fn(), onDelete: vi.fn() },
            {}
        );

        const searchInput = document.getElementById('history-search');
        searchInput.value = 'Alpha';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(listEl.querySelectorAll('.history-item')).toHaveLength(1);

        document.getElementById('history-search-clear').click();

        expect(searchInput.value).toBe('');
        expect(listEl.querySelectorAll('.history-item')).toHaveLength(2);
    });

    it('collapses the wide sidebar when the expanded history empty space is clicked', () => {
        document.body.classList.add('layout-wide');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar open';
        const controller = new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        document.getElementById('history-list').click();

        expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);
        expect(sidebar.classList.contains('collapsed')).toBe(true);
        controller.close();
    });

    it('does not toggle the sidebar when a history item is clicked', () => {
        document.body.classList.add('layout-wide');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar open';
        const onSwitch = vi.fn();
        const controller = new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [{ id: 'active', title: 'A compact history row', messages: [] }],
            'active',
            { onSwitch, onDelete: vi.fn() },
            {}
        );

        document.querySelector('.history-item').click();

        expect(onSwitch).toHaveBeenCalledWith('active');
        expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);
    });

    it('expands the wide sidebar when collapsed rail blank space is clicked', () => {
        document.body.classList.add('layout-wide', 'sidebar-collapsed');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar collapsed';

        new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        document.querySelector('.collapsed-sidebar-spacer').click();

        expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);
        expect(sidebar.classList.contains('collapsed')).toBe(false);
        expect(sidebar.classList.contains('open')).toBe(true);
    });

    it('requests the persisted sidebar expanded state on startup', () => {
        new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar: document.createElement('div'),
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        expect(messagingMocks.requestSidebarExpandedFromStorage).toHaveBeenCalledTimes(1);
    });

    it('restores the wide sidebar collapsed state from parent storage', () => {
        document.body.classList.add('layout-wide');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar open';

        const controller = new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.restoreSidebarExpanded(false);

        expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);
        expect(sidebar.classList.contains('collapsed')).toBe(true);
        expect(sidebar.classList.contains('open')).toBe(false);
        expect(messagingMocks.saveSidebarExpandedToStorage).not.toHaveBeenCalled();
    });

    it('uses the sidebar expanded URL hint before parent storage responds', () => {
        window.history.replaceState(null, '', '/sandbox/index.html?sidebarExpanded=false');
        document.body.classList.add('layout-wide');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar open';

        new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);
        expect(sidebar.classList.contains('collapsed')).toBe(true);
        expect(messagingMocks.requestSidebarExpandedFromStorage).toHaveBeenCalledTimes(1);
        expect(messagingMocks.saveSidebarExpandedToStorage).not.toHaveBeenCalled();
    });

    it('persists wide sidebar expansion changes when toggled', () => {
        document.body.classList.add('layout-wide');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar open';

        new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        document.getElementById('history-list').click();
        expect(messagingMocks.saveSidebarExpandedToStorage).toHaveBeenLastCalledWith(false);

        document.querySelector('.collapsed-sidebar-spacer').click();
        expect(messagingMocks.saveSidebarExpandedToStorage).toHaveBeenLastCalledWith(true);
    });

    it('renders compact AMC-style history rows with a hover menu trigger', () => {
        const listEl = document.getElementById('history-list');
        const onSwitch = vi.fn();
        const controller = new SidebarController(
            {
                historyListEl: listEl,
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [{ id: 'active', title: 'A compact history row', messages: [] }],
            'active',
            { onSwitch, onDelete: vi.fn() },
            {}
        );

        const row = listEl.querySelector('.history-item');
        expect(row.classList.contains('active')).toBe(true);
        expect(row.getAttribute('role')).toBe('button');
        expect(row.querySelector('.history-title').textContent).toBe('A compact history row');

        expect(row.querySelector('button.history-delete')).toBeNull();
        const menuTrigger = row.querySelector('button.history-menu-trigger');
        expect(menuTrigger).not.toBeNull();
        expect(menuTrigger.getAttribute('aria-label')).toBe('More options');
        expect(menuTrigger.getAttribute('aria-haspopup')).toBe('menu');
    });

    it('opens a history item menu and deletes from the menu action', () => {
        const listEl = document.getElementById('history-list');
        const onDelete = vi.fn();
        window.confirm = vi.fn(() => true);
        const controller = new SidebarController(
            {
                historyListEl: listEl,
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [{ id: 'active', title: 'A compact history row', messages: [] }],
            'active',
            { onSwitch: vi.fn(), onDelete },
            {}
        );

        listEl.querySelector('.history-menu-trigger').click();

        const menu = listEl.querySelector('.history-item-menu');
        expect(menu).not.toBeNull();
        expect(menu.getAttribute('role')).toBe('menu');

        menu.querySelector('.history-menu-delete').click();

        expect(window.confirm).toHaveBeenCalledWith('Delete this chat?');
        expect(onDelete).toHaveBeenCalledWith('active');
        expect(listEl.querySelector('.history-item-menu')).toBeNull();
    });

    it('opens a history item menu from the row context menu', () => {
        const listEl = document.getElementById('history-list');
        const controller = new SidebarController(
            {
                historyListEl: listEl,
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [{ id: 'active', title: 'A compact history row', messages: [] }],
            'active',
            { onSwitch: vi.fn(), onDelete: vi.fn() },
            {}
        );

        const row = listEl.querySelector('.history-item');
        row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

        const renderedRow = listEl.querySelector('.history-item');
        expect(renderedRow.querySelector('.history-item-menu')).not.toBeNull();
        expect(
            renderedRow.querySelector('.history-menu-trigger').getAttribute('aria-expanded')
        ).toBe('true');
    });

    it('opens a collapsed recent chats popover and switches sessions from it', () => {
        document.body.classList.add('layout-wide', 'sidebar-collapsed');
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar collapsed';
        const listEl = document.getElementById('history-list');
        const onSwitch = vi.fn();
        const controller = new SidebarController(
            {
                historyListEl: listEl,
                sidebar,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [
                { id: 'active', title: 'Active chat', timestamp: 10, messages: [] },
                { id: 'older', title: 'Older chat', timestamp: 20, messages: [] },
                { id: 'newer', title: 'Newer chat', timestamp: 30, messages: [] },
            ],
            'active',
            { onSwitch, onDelete: vi.fn() },
            {}
        );

        document.getElementById('collapsed-recent-chats-btn').click();

        const popover = document.getElementById('collapsed-recent-popover');
        expect(popover.hidden).toBe(false);
        const items = [...popover.querySelectorAll('.collapsed-recent-item')];
        expect(items.map((item) => item.textContent.trim())).toEqual(['Newer chat', 'Older chat']);

        items[0].click();

        expect(onSwitch).toHaveBeenCalledWith('newer');
        expect(popover.hidden).toBe(true);
    });

    it('opens the collapsed recent chats popover on focus', () => {
        const controller = new SidebarController(
            {
                historyListEl: document.getElementById('history-list'),
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [
                { id: 'active', title: 'Active chat', timestamp: 10, messages: [] },
                { id: 'recent', title: 'Recent chat', timestamp: 20, messages: [] },
            ],
            'active',
            { onSwitch: vi.fn(), onDelete: vi.fn() },
            {}
        );

        document
            .getElementById('collapsed-recent-chats-btn')
            .dispatchEvent(new FocusEvent('focus'));

        const popover = document.getElementById('collapsed-recent-popover');
        expect(popover.hidden).toBe(false);
        expect(popover.querySelector('.collapsed-recent-item').textContent).toBe('Recent chat');
    });

    it('closes history menus and collapsed popovers with Escape', () => {
        const listEl = document.getElementById('history-list');
        const controller = new SidebarController(
            {
                historyListEl: listEl,
                sidebar: null,
                sidebarOverlay: null,
                historyToggleBtn: null,
                closeSidebarBtn: null,
            },
            {}
        );

        controller.renderList(
            [{ id: 'active', title: 'A compact history row', messages: [] }],
            'active',
            { onSwitch: vi.fn(), onDelete: vi.fn() },
            {}
        );
        listEl.querySelector('.history-menu-trigger').click();
        document.getElementById('collapsed-recent-chats-btn').click();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(listEl.querySelector('.history-item-menu')).toBeNull();
        expect(document.getElementById('collapsed-recent-popover').hidden).toBe(true);
    });
});
