import { bindInputEvents } from './input_events.js';
import { bindToolButtonEvents } from './tool_button_events.js';

export { getToolsPageScrollDistance } from './tool_button_events.js';

export function bindAppEvents(app, ui, setResizeRef) {
    document
        .getElementById('new-chat-header-btn')
        .addEventListener('click', () => app.handleNewChat());

    const tabSwitcherBtn = document.getElementById('tab-switcher-btn');
    if (tabSwitcherBtn) {
        tabSwitcherBtn.addEventListener('click', () => app.handleTabSwitcher());
    }

    const openFullPageBtn = document.getElementById('open-full-page-btn');
    if (openFullPageBtn) {
        openFullPageBtn.addEventListener('click', () => {
            window.parent.postMessage({ action: 'OPEN_FULL_PAGE' }, '*');
        });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.parent.postMessage({ action: 'OPEN_SETTINGS_PAGE' }, '*');
        });
    }

    bindToolButtonEvents(app, ui);
    bindInputEvents(app, ui, setResizeRef);
}
