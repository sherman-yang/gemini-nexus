import { t } from '../core/i18n.js';
import Fuse from 'fuse.js';

export class SidebarController {
    constructor(elements, callbacks) {
        this.sidebar = elements.sidebar;
        this.overlay = elements.sidebarOverlay;
        this.listEl = elements.historyListEl;
        this.toggleBtn = elements.historyToggleBtn;
        this.closeBtn = elements.closeSidebarBtn;

        this.searchInput = document.getElementById('history-search');

        this.callbacks = callbacks || {};

        this.allSessions = [];
        this.currentSessionId = null;
        this.itemCallbacks = null;
        this.renderState = { isGenerating: false, generatingSessionId: null };
        this.fuse = null;
        this.focusTimer = null;

        this.initListeners();
    }

    initListeners() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.close();
                if (this.callbacks.onOverlayClick) {
                    this.callbacks.onOverlayClick();
                }
            });
        }
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (inputEvent) =>
                this.handleSearch(inputEvent.target.value)
            );
        }
    }

    toggle() {
        if (!this.sidebar) return;

        const willOpen = !this.sidebar.classList.contains('open');
        this.sidebar.classList.toggle('open', willOpen);
        document.body.classList.toggle('sidebar-open', willOpen);
        if (this.overlay) {
            this.overlay.classList.toggle('visible', willOpen);
        }

        this._clearFocusTimer();

        if (willOpen && this.searchInput) {
            this.focusTimer = window.setTimeout(() => {
                this.focusTimer = null;
                this.searchInput.focus({ preventScroll: true });
            }, 220);
        }
    }

    close() {
        this._clearFocusTimer();
        if (this.sidebar) this.sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        if (this.overlay) this.overlay.classList.remove('visible');
    }

    _clearFocusTimer() {
        if (this.focusTimer === null) return;
        window.clearTimeout(this.focusTimer);
        this.focusTimer = null;
    }

    _initSearch() {
        if (this.fuse) return;

        if (this.allSessions && this.allSessions.length > 0) {
            this.fuse = new Fuse(this.allSessions, {
                keys: [
                    { name: 'title', weight: 0.7 },
                    { name: 'messages.text', weight: 0.3 },
                ],
                threshold: 0.4,
                ignoreLocation: true,
            });
        }
    }

    handleSearch(query) {
        if (!this.allSessions) return;

        let displayList = this.allSessions;

        this._initSearch();

        if (query.trim() && this.fuse) {
            const results = this.fuse.search(query);
            displayList = results.map((searchResult) => searchResult.item);
        }

        this._renderDOM(displayList);
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

        this.fuse = null;

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
            const sessionRow = document.createElement('div');
            sessionRow.className = `history-item ${
                session.id === this.currentSessionId ? 'active' : ''
            }`;
            sessionRow.onclick = () => {
                this.itemCallbacks.onSwitch(session.id);
                // On mobile or small screens, maybe auto-close sidebar?
                // Keeping current behavior: explicit close required or select closes
                if (window.innerWidth < 600) {
                    this.close();
                }
            };

            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-title';
            titleSpan.textContent = session.title;

            const spinner = document.createElement('span');
            spinner.className = 'history-generating-spinner';
            spinner.title = t('generating');
            spinner.setAttribute('aria-label', t('generating'));

            const deleteButton = document.createElement('span');
            deleteButton.className = 'history-delete';
            deleteButton.textContent = '✕';
            deleteButton.title = t('delete');
            deleteButton.onclick = (clickEvent) => {
                clickEvent.stopPropagation();
                if (confirm(t('deleteChatConfirm'))) {
                    this.itemCallbacks.onDelete(session.id);
                }
            };

            sessionRow.appendChild(titleSpan);
            if (isGeneratingSession) {
                sessionRow.appendChild(spinner);
            }
            sessionRow.appendChild(deleteButton);
            fragment.appendChild(sessionRow);
        });

        this.listEl.replaceChildren(fragment);
    }
}
