import { t } from '../core/i18n.js';
import { TemplateIcons } from './templates/icons.js';
import {
    requestSidebarExpandedFromStorage,
    saveSidebarExpandedToStorage,
} from '../../shared/messaging/index.js';

function readInitialSidebarExpandedFromUrl(locationLike = window.location) {
    try {
        const url = new URL(locationLike.href);
        const value = url.searchParams.get('sidebarExpanded');
        if (value === 'true') return true;
        if (value === 'false') return false;
    } catch {
        return null;
    }

    return null;
}

export class SidebarController {
    constructor(elements, callbacks) {
        this.sidebar = elements.sidebar;
        this.overlay = elements.sidebarOverlay;
        this.listEl = elements.historyListEl;
        this.toggleBtn = elements.historyToggleBtn;
        this.closeBtn = elements.closeSidebarBtn;

        this.searchContainer = document.querySelector('.search-container');
        this.searchInput = document.getElementById('history-search');
        this.searchToggleBtn = document.getElementById('sidebar-search-toggle');
        this.searchClearBtn = document.getElementById('history-search-clear');
        this.sidebarHistory = document.querySelector('.sidebar-history');
        this.collapsedRail = document.querySelector('.collapsed-sidebar-rail');
        this.collapsedToggleBtn = document.getElementById('collapsed-sidebar-toggle');
        this.collapsedSearchBtn = document.getElementById('collapsed-search-btn');
        this.collapsedRecentBtn = document.getElementById('collapsed-recent-chats-btn');
        this.collapsedRecentPopover = document.getElementById('collapsed-recent-popover');

        this.callbacks = callbacks || {};

        this.allSessions = [];
        this.currentSessionId = null;
        this.itemCallbacks = null;
        this.renderState = { isGenerating: false, generatingSessionId: null };
        this.searchOpen = this.searchContainer ? !this.searchContainer.hidden : false;
        this.activeMenuSessionId = null;
        this.isCollapsedRecentOpen = false;
        this.collapsedRecentPinned = false;
        this.collapsedRecentCloseTimer = null;
        this.restoredSidebarExpanded = readInitialSidebarExpandedFromUrl();

        this.initListeners();
        this.restorePersistedWideSidebarState();
        requestSidebarExpandedFromStorage();
    }

    initListeners() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.toggle());
        }
        if (this.collapsedToggleBtn) {
            this.collapsedToggleBtn.addEventListener('click', () => this.toggle());
        }
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.close();
                if (this.callbacks.onOverlayClick) {
                    this.callbacks.onOverlayClick();
                }
            });
        }
        if (this.sidebarHistory) {
            this.sidebarHistory.addEventListener('click', (clickEvent) =>
                this.handleExpandedEmptySpaceClick(clickEvent)
            );
        }
        if (this.collapsedRail) {
            this.collapsedRail.addEventListener('click', (clickEvent) =>
                this.handleCollapsedRailEmptySpaceClick(clickEvent)
            );
        }
        if (this.searchToggleBtn) {
            this.searchToggleBtn.addEventListener('click', () => this.openSearch());
        }
        if (this.collapsedSearchBtn) {
            this.collapsedSearchBtn.addEventListener('click', () => this.openSearch());
        }
        if (this.collapsedRecentBtn) {
            this.collapsedRecentBtn.addEventListener('click', (clickEvent) => {
                clickEvent.stopPropagation();
                this.toggleCollapsedRecentPopover();
            });
            this.collapsedRecentBtn.addEventListener('mouseenter', () =>
                this.openCollapsedRecentPopover()
            );
            this.collapsedRecentBtn.addEventListener('mouseleave', () =>
                this.scheduleCollapsedRecentClose()
            );
            this.collapsedRecentBtn.addEventListener('focus', () =>
                this.openCollapsedRecentPopover()
            );
            this.collapsedRecentBtn.addEventListener('blur', () =>
                this.scheduleCollapsedRecentClose()
            );
        }
        if (this.collapsedRecentPopover) {
            this.collapsedRecentPopover.addEventListener('mouseenter', () =>
                this.clearCollapsedRecentCloseTimer()
            );
            this.collapsedRecentPopover.addEventListener('mouseleave', () =>
                this.scheduleCollapsedRecentClose()
            );
        }
        if (this.searchClearBtn) {
            this.searchClearBtn.addEventListener('click', () => this.clearSearch());
        }
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (inputEvent) =>
                this.handleSearch(inputEvent.target.value)
            );
            this.searchInput.addEventListener('keydown', (keyboardEvent) => {
                if (keyboardEvent.key !== 'Escape') return;

                if (this.searchInput.value.trim()) {
                    this.clearSearch();
                } else {
                    this.closeSearch();
                }
            });
        }

        document.addEventListener('click', (clickEvent) => this.handleDocumentClick(clickEvent));
        document.addEventListener('keydown', (keyboardEvent) =>
            this.handleDocumentKeydown(keyboardEvent)
        );
    }

    _isWideLayout() {
        return document.body.classList.contains('layout-wide');
    }

    handleExpandedEmptySpaceClick(clickEvent) {
        const target = clickEvent.target;
        const clickedHistoryShell = target === clickEvent.currentTarget;
        const clickedHistoryListBlank = target === this.listEl;

        if (!clickedHistoryShell && !clickedHistoryListBlank) return;

        this.toggle();
    }

    handleCollapsedRailEmptySpaceClick(clickEvent) {
        const target = clickEvent.target;
        const clickedRailShell = target === clickEvent.currentTarget;
        const clickedRailBlankChild =
            target instanceof Element &&
            Boolean(target.closest('.collapsed-sidebar-spacer, .collapsed-sidebar-separator'));

        if (!clickedRailShell && !clickedRailBlankChild) return;

        this.toggle();
    }

    handleDocumentClick(clickEvent) {
        const target = clickEvent.target;

        if (
            this.activeMenuSessionId &&
            target instanceof Node &&
            !target.closest?.('.history-item-menu') &&
            !target.closest?.('.history-menu-trigger')
        ) {
            this.closeItemMenu();
        }

        if (
            this.isCollapsedRecentOpen &&
            target instanceof Node &&
            !this.collapsedRecentPopover?.contains(target) &&
            !this.collapsedRecentBtn?.contains(target)
        ) {
            this.closeCollapsedRecentPopover();
        }
    }

    handleDocumentKeydown(keyboardEvent) {
        if (keyboardEvent.key !== 'Escape') return;

        this.closeItemMenu();
        this.closeCollapsedRecentPopover();
    }

    _setMobileSidebarState(isOpen) {
        if (!this.sidebar) return;

        this.sidebar.classList.toggle('open', isOpen);
        document.body.classList.toggle('sidebar-open', isOpen);
        if (this.overlay) {
            this.overlay.classList.toggle('visible', isOpen);
        }

        if (!isOpen) {
            this.closeSearch();
            this.closeItemMenu();
            this.closeCollapsedRecentPopover();
        }
    }

    _setWideSidebarCollapsed(isCollapsed, { persist = true } = {}) {
        if (!this.sidebar) return;

        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        this.sidebar.classList.toggle('collapsed', isCollapsed);
        this.sidebar.classList.toggle('open', !isCollapsed);

        if (persist) {
            this.restoredSidebarExpanded = !isCollapsed;
            saveSidebarExpandedToStorage(!isCollapsed);
        }

        if (isCollapsed) {
            this.closeSearch();
        }

        this.closeItemMenu();
        this.closeCollapsedRecentPopover();
    }

    restoreSidebarExpanded(isExpanded) {
        if (typeof isExpanded !== 'boolean') return;

        this.restoredSidebarExpanded = isExpanded;

        if (!this.sidebar || !this._isWideLayout()) return;

        this._setWideSidebarCollapsed(!isExpanded, { persist: false });
    }

    restorePersistedWideSidebarState() {
        if (this.restoredSidebarExpanded === null) return;

        this.restoreSidebarExpanded(this.restoredSidebarExpanded);
    }

    handleLayoutModeChange(isWide) {
        if (!this.sidebar) return;

        if (isWide) {
            this.restorePersistedWideSidebarState();
            return;
        }

        document.body.classList.remove('sidebar-collapsed');
        this.sidebar.classList.remove('collapsed');
        this._setMobileSidebarState(false);
    }

    toggle() {
        if (!this.sidebar) return;

        if (this._isWideLayout()) {
            const willCollapse = !document.body.classList.contains('sidebar-collapsed');
            this._setWideSidebarCollapsed(willCollapse);
            return;
        }

        const willOpen = !this.sidebar.classList.contains('open');
        this._setMobileSidebarState(willOpen);
    }

    close() {
        if (!this.sidebar) return;

        if (this._isWideLayout()) {
            this._setWideSidebarCollapsed(true);
            return;
        }

        this._setMobileSidebarState(false);
    }

    openSearch() {
        if (!this.searchContainer || !this.searchInput || !this.searchToggleBtn) return;

        this.closeItemMenu();
        this.closeCollapsedRecentPopover();

        if (this._isWideLayout() && document.body.classList.contains('sidebar-collapsed')) {
            this._setWideSidebarCollapsed(false);
        }

        this.searchContainer.hidden = false;
        this.searchToggleBtn.hidden = true;
        this.searchOpen = true;
        document.body.classList.add('sidebar-search-open');
        this.searchInput.focus({ preventScroll: true });
        this.searchInput.select();
    }

    closeSearch({ clearQuery = true } = {}) {
        if (this.searchInput && clearQuery) {
            this.searchInput.value = '';
        }

        if (this.searchContainer) {
            this.searchContainer.hidden = true;
        }
        if (this.searchToggleBtn) {
            this.searchToggleBtn.hidden = false;
        }

        this.searchOpen = false;
        document.body.classList.remove('sidebar-search-open');

        this.closeItemMenu();

        if (clearQuery) {
            this._renderDOM(this.allSessions);
        }
    }

    clearSearch() {
        if (!this.searchInput) return;

        this.searchInput.value = '';
        this.handleSearch('');
        this.searchInput.focus({ preventScroll: true });
    }

    handleSearch(query) {
        if (!this.allSessions) return;

        const normalizedQuery = query.trim().toLowerCase();
        const displayList = normalizedQuery
            ? this.allSessions.filter((session) =>
                  this._sessionMatchesQuery(session, normalizedQuery)
              )
            : this.allSessions;

        this._renderDOM(displayList);
    }

    _sessionMatchesQuery(session, normalizedQuery) {
        const messageTexts = Array.isArray(session.messages)
            ? session.messages.map((message) =>
                  typeof message?.text === 'string' ? message.text : ''
              )
            : [];

        return [session.title || '', ...messageTexts].some((field) =>
            field.toLowerCase().includes(normalizedQuery)
        );
    }

    openItemMenu(sessionId) {
        this.activeMenuSessionId = sessionId;
        this.closeCollapsedRecentPopover();
        this._renderDOM(this._getDisplayedSessions());
    }

    closeItemMenu() {
        if (!this.activeMenuSessionId) return;

        this.activeMenuSessionId = null;
        this._renderDOM(this._getDisplayedSessions());
    }

    _getDisplayedSessions() {
        const currentQuery = this.searchInput ? this.searchInput.value.trim().toLowerCase() : '';
        if (!currentQuery) return this.allSessions;

        return this.allSessions.filter((session) =>
            this._sessionMatchesQuery(session, currentQuery)
        );
    }

    getRecentSessions() {
        return [...(this.allSessions || [])]
            .filter((session) => session.id !== this.currentSessionId)
            .sort((first, second) => (second.timestamp || 0) - (first.timestamp || 0))
            .slice(0, 8);
    }

    toggleCollapsedRecentPopover() {
        if (this.isCollapsedRecentOpen && this.collapsedRecentPinned) {
            this.closeCollapsedRecentPopover();
            return;
        }

        this.openCollapsedRecentPopover({ pinned: true });
    }

    openCollapsedRecentPopover({ pinned = false } = {}) {
        if (!this.collapsedRecentPopover || !this.collapsedRecentBtn) return;

        this.clearCollapsedRecentCloseTimer();
        this.closeItemMenu();
        this.renderCollapsedRecentPopover();
        this.collapsedRecentPopover.hidden = false;
        this.collapsedRecentBtn.setAttribute('aria-expanded', 'true');
        if (pinned || !this.isCollapsedRecentOpen) {
            this.collapsedRecentPinned = pinned;
        }
        this.isCollapsedRecentOpen = true;
    }

    closeCollapsedRecentPopover() {
        this.clearCollapsedRecentCloseTimer();

        if (!this.collapsedRecentPopover || !this.collapsedRecentBtn) {
            this.isCollapsedRecentOpen = false;
            this.collapsedRecentPinned = false;
            return;
        }

        this.collapsedRecentPopover.hidden = true;
        this.collapsedRecentBtn.setAttribute('aria-expanded', 'false');
        this.isCollapsedRecentOpen = false;
        this.collapsedRecentPinned = false;
    }

    clearCollapsedRecentCloseTimer() {
        if (this.collapsedRecentCloseTimer === null) return;

        window.clearTimeout(this.collapsedRecentCloseTimer);
        this.collapsedRecentCloseTimer = null;
    }

    scheduleCollapsedRecentClose() {
        if (this.collapsedRecentPinned) return;

        this.clearCollapsedRecentCloseTimer();
        this.collapsedRecentCloseTimer = window.setTimeout(() => {
            this.collapsedRecentCloseTimer = null;
            this.closeCollapsedRecentPopover();
        }, 120);
    }

    renderCollapsedRecentPopover() {
        if (!this.collapsedRecentPopover) return;

        const recentSessions = this.getRecentSessions();
        const fragment = document.createDocumentFragment();

        const title = document.createElement('div');
        title.className = 'collapsed-recent-title';
        title.textContent = t('recentChats');
        fragment.appendChild(title);

        if (recentSessions.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'collapsed-recent-empty';
            emptyState.textContent = t('noConversations');
            fragment.appendChild(emptyState);
            this.collapsedRecentPopover.replaceChildren(fragment);
            return;
        }

        recentSessions.forEach((session) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'collapsed-recent-item';
            item.textContent = session.title;
            item.onclick = () => {
                if (this.itemCallbacks?.onSwitch) {
                    this.itemCallbacks.onSwitch(session.id);
                }
                this.closeCollapsedRecentPopover();
            };
            fragment.appendChild(item);
        });

        this.collapsedRecentPopover.replaceChildren(fragment);
    }

    renderList(sessions, currentId, itemCallbacks, renderState = {}) {
        if (!this.listEl) return;

        this.allSessions = sessions;
        this.currentSessionId = currentId;
        this.itemCallbacks = itemCallbacks;
        this.renderState = {
            isGenerating: renderState.isGenerating === true,
            generatingSessionId: renderState.generatingSessionId || null,
        };

        if (this.isCollapsedRecentOpen) {
            this.renderCollapsedRecentPopover();
        }

        const currentQuery = this.searchInput ? this.searchInput.value : '';
        if (currentQuery.trim()) {
            this.handleSearch(currentQuery);
        } else {
            this._renderDOM(this.allSessions);
        }
    }

    _renderDOM(sessions) {
        const fragment = document.createDocumentFragment();

        if (sessions.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-list-state';
            emptyState.textContent = t('noConversations');
            fragment.appendChild(emptyState);
            this.listEl.replaceChildren(fragment);
            return;
        }

        sessions.forEach((session) => {
            const isGeneratingSession =
                this.renderState.isGenerating &&
                this.renderState.generatingSessionId === session.id;
            const isMenuOpen = this.activeMenuSessionId === session.id;
            const sessionRow = document.createElement('div');
            sessionRow.className = [
                'history-item',
                session.id === this.currentSessionId ? 'active' : '',
                isMenuOpen ? 'menu-open' : '',
            ]
                .filter(Boolean)
                .join(' ');
            sessionRow.setAttribute('role', 'button');
            sessionRow.tabIndex = 0;

            const handleSelect = () => {
                if (this.itemCallbacks?.onSwitch) {
                    this.itemCallbacks.onSwitch(session.id);
                }
                if (window.innerWidth < 600) {
                    this.close();
                }
            };

            sessionRow.onclick = handleSelect;
            sessionRow.onkeydown = (keyboardEvent) => {
                if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;

                keyboardEvent.preventDefault();
                handleSelect();
            };
            sessionRow.oncontextmenu = (mouseEvent) => {
                mouseEvent.preventDefault();
                this.openItemMenu(session.id);
            };

            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-title';
            titleSpan.textContent = session.title;

            const spinner = document.createElement('span');
            spinner.className = 'history-generating-spinner';
            spinner.title = t('generating');
            spinner.setAttribute('aria-label', t('generating'));

            const menuButton = document.createElement('button');
            menuButton.type = 'button';
            menuButton.className = 'history-menu-trigger';
            menuButton.innerHTML = TemplateIcons.MORE_HORIZONTAL;
            menuButton.title = t('moreOptions');
            menuButton.setAttribute('aria-label', t('moreOptions'));
            menuButton.setAttribute('aria-haspopup', 'menu');
            menuButton.setAttribute('aria-expanded', isMenuOpen ? 'true' : 'false');
            menuButton.onclick = (clickEvent) => {
                clickEvent.stopPropagation();
                if (isMenuOpen) {
                    this.closeItemMenu();
                    return;
                }
                this.openItemMenu(session.id);
            };
            menuButton.onkeydown = (keyboardEvent) => keyboardEvent.stopPropagation();

            sessionRow.appendChild(titleSpan);
            if (isGeneratingSession) {
                sessionRow.appendChild(spinner);
            }
            sessionRow.appendChild(menuButton);

            if (isMenuOpen) {
                sessionRow.appendChild(this.createHistoryItemMenu(session));
            }
            fragment.appendChild(sessionRow);
        });

        this.listEl.replaceChildren(fragment);
    }

    createHistoryItemMenu(session) {
        const menu = document.createElement('div');
        menu.className = 'history-item-menu';
        menu.setAttribute('role', 'menu');
        menu.onclick = (clickEvent) => clickEvent.stopPropagation();

        const deleteItem = document.createElement('button');
        deleteItem.type = 'button';
        deleteItem.className = 'history-menu-item history-menu-delete';
        deleteItem.setAttribute('role', 'menuitem');
        deleteItem.innerHTML = `${TemplateIcons.TRASH}<span>${t('delete')}</span>`;
        deleteItem.onclick = (clickEvent) => {
            clickEvent.stopPropagation();
            if (confirm(t('deleteChatConfirm')) && this.itemCallbacks?.onDelete) {
                this.itemCallbacks.onDelete(session.id);
            }
            this.closeItemMenu();
        };

        menu.appendChild(deleteItem);
        return menu;
    }
}
