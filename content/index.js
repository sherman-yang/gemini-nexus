(function () {
    if (window.GeminiNexusPageGuard?.isDisabled) return;
    if (window.GeminiNexusContentReady === true) return;

    const shortcuts = window.GeminiShortcuts;
    const router = window.GeminiMessageRouter;
    const Overlay = window.GeminiNexusOverlay;
    const Controller = window.GeminiToolbarController;
    const settingsSync = window.GeminiContentSettingsSync;

    const selectionOverlay = new Overlay();
    const floatingToolbar = new Controller();

    router.init(floatingToolbar, selectionOverlay);

    shortcuts.setController(floatingToolbar);

    settingsSync?.init?.(floatingToolbar);

    window.GeminiNexusContentReady = true;
})();
