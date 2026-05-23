import { toControlTabSummary } from '../control/tabs.js';

export function handleGetOpenTabs(context, request, sender, sendResponse) {
    (async () => {
        const tabQuery = { currentWindow: true };
        const groupId = context.controlManager?.getControlledGroupId?.();
        const windowId = context.controlManager?.getControlledWindowId?.();
        if (Number.isInteger(windowId) && windowId > 0) {
            delete tabQuery.currentWindow;
            tabQuery.windowId = windowId;
        }
        if (Number.isInteger(groupId) && groupId >= 0) {
            tabQuery.groupId = groupId;
        }

        const tabs = await chrome.tabs.query(tabQuery);
        const safeTabs = tabs.map((tab) => toControlTabSummary(tab));
        const lockedTabId = context.controlManager ? context.controlManager.getTargetTabId() : null;

        chrome.runtime
            .sendMessage({
                action: 'OPEN_TABS_RESULT',
                tabId: context.getTargetSidePanelTabId(request, sender),
                tabs: safeTabs,
                lockedTabId,
            })
            .catch(() => {});
        sendResponse({ status: 'completed' });
    })();
}

export function handleSwitchTab(context, request, sender, sendResponse) {
    (async () => {
        const tabId = request.tabId || null;
        if (
            tabId &&
            context.controlManager?.isTabControllable &&
            !(await context.controlManager.isTabControllable(tabId))
        ) {
            sendResponse({ status: 'error', error: 'Tab cannot be controlled.' });
            return;
        }

        if (context.controlManager) {
            context.controlManager.setOwnerSidePanelTabId?.(
                context.getTargetSidePanelTabId(request, sender)
            );
            context.controlManager.setTargetTab(tabId);
        }
        if (tabId && request.switchVisual !== false) {
            chrome.tabs
                .update(tabId, { active: true })
                .catch((tabUpdateError) => console.warn(tabUpdateError));
        }
        sendResponse({ status: 'switched' });
    })();
}
