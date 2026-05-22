(function () {
    /**
     * Main View Facade
     * Orchestrates WidgetView and WindowView
     */
    class ToolbarView {
        constructor(shadowRoot) {
            this.shadow = shadowRoot;
            this.elements = {};
            this.cacheElements();

            // Initialize Sub-Views
            this.widgetView = new window.GeminiViewWidget(this.elements);
            this.windowView = new window.GeminiViewWindow(this.elements);

            // Initial resize of provider/model selects if present.
            const Layout = window.GeminiViewLayout;
            if (this.elements.askProviderSelect && Layout && Layout.resizeSelect) {
                Layout.resizeSelect(this.elements.askProviderSelect);
            }
            if (this.elements.askModelSelect && Layout && Layout.resizeSelect) {
                Layout.resizeSelect(this.elements.askModelSelect);
            }
        }

        cacheElements() {
            const get = (id) => this.shadow.getElementById(id);
            this.elements = {
                toolbar: get('toolbar'),
                toolbarDrag: get('toolbar-drag'),
                customSelectionTools: get('custom-selection-tools'),
                customSelectionMore: get('custom-selection-more'),
                customSelectionMoreMenu: get('custom-selection-more-menu'),
                imageBtn: get('image-btn'),

                // New Window Elements
                askWindow: get('ask-window'),
                askHeader: get('ask-header'),
                windowTitle: get('window-title'),
                contextPreview: get('context-preview'),
                askInput: get('ask-input'),
                translationTargets: get('translation-targets'),
                translationTargetTrigger: get('translation-target-trigger'),
                translationTargetMenu: get('translation-target-menu'),
                translationTargetSummary: get('translation-target-summary'),
                translationTargetOptions: get('translation-target-options'),
                resultArea: get('result-area'),
                resultText: get('result-text'),
                askProviderSelect: get('ask-provider-select'),
                askModelSelect: get('ask-model-select'),

                // Footer Elements
                windowFooter: get('window-footer'),
                footerActions: get('footer-actions'),
                footerStop: get('footer-stop'),

                // Buttons
                buttons: {
                    copySelection: get('btn-copy'),
                    ask: get('btn-ask'),
                    grammar: get('btn-grammar'),
                    translate: get('btn-translate'),
                    explain: get('btn-explain'),
                    summarize: get('btn-summarize'),
                    customSelectionMore: get('btn-custom-selection-more'),
                    headerClose: get('btn-header-close'),
                    stop: get('btn-stop-gen'),
                    continue: get('btn-continue-chat'),
                    copy: get('btn-copy-result'),
                    retry: get('btn-retry'),
                    insert: get('btn-insert'),
                    replace: get('btn-replace'),

                    // Image Menu Buttons
                    imageChat: get('btn-image-chat'),
                    imageDescribe: get('btn-image-describe'),
                    imageExtract: get('btn-image-extract'),
                    imageTranslate: get('btn-image-translate'),

                    // Image Edit Buttons
                    imageRemoveBg: get('btn-image-remove-bg'),
                    imageRemoveText: get('btn-image-remove-text'),
                    imageRemoveWatermark: get('btn-image-remove-watermark'),
                    imageUpscale: get('btn-image-upscale'),
                    imageExpand: get('btn-image-expand'),
                },
            };
        }

        // --- Delegation to Widget View ---

        showToolbar(rect, mousePoint) {
            this.widgetView.showToolbar(rect, mousePoint);
        }
        hideToolbar() {
            this.widgetView.hideToolbar();
        }
        showImageButton(rect) {
            this.widgetView.showImageButton(rect);
        }
        hideImageButton() {
            this.widgetView.hideImageButton();
        }
        isToolbarVisible() {
            return this.widgetView.isToolbarVisible();
        }
        toggleCopySelectionIcon(success) {
            this.widgetView.toggleCopySelectionIcon(success);
        }

        // --- Delegation to Window View ---

        showAskWindow(rect, contextText, title, resetDrag, mousePoint) {
            return this.windowView.show(rect, contextText, title, resetDrag, mousePoint);
        }
        hideAskWindow() {
            this.windowView.hide();
        }
        showLoading(msg) {
            this.windowView.showLoading(msg);
        }

        showResult(text, title, isStreaming) {
            this.windowView.showResult(text, title, isStreaming);
        }

        updateStreamingState(isStreaming) {
            this.windowView.updateStreamingState(isStreaming);
        }

        showError(text) {
            this.windowView.showError(text);
        }
        toggleCopyIcon(success) {
            this.windowView.toggleCopyIcon(success);
        }
        setInputValue(text) {
            this.windowView.setInputValue(text);
        }
        setTranslationTargetsVisible(visible) {
            this.windowView.setTranslationTargetsVisible(visible);
        }
        toggleTranslationTargetDropdown() {
            this.windowView.toggleTranslationTargetDropdown();
        }
        getSelectedTranslationTargets() {
            return this.windowView.getSelectedTranslationTargets();
        }
        setSelectedTranslationTargets(targets) {
            this.windowView.setSelectedTranslationTargets(targets);
        }
        isWindowVisible() {
            return this.windowView.isVisible();
        }

        dockWindow(side, top) {
            this.windowView.dockWindow(side, top);
        }
        undockWindow() {
            this.windowView.undockWindow();
        }

        // --- Model Selection ---

        getSelectedModel() {
            return this.elements.askModelSelect
                ? this.elements.askModelSelect.value
                : '8c46e95b1a07cecc';
        }

        setSelectedProvider(provider) {
            const Layout = window.GeminiViewLayout;
            if (this.elements.askProviderSelect && provider) {
                this.elements.askProviderSelect.value = provider;
                if (Layout && Layout.resizeSelect)
                    Layout.resizeSelect(this.elements.askProviderSelect);
            }
        }

        setSelectedModel(model) {
            const Layout = window.GeminiViewLayout;
            if (this.elements.askModelSelect && model) {
                this.elements.askModelSelect.value = model;
                if (Layout && Layout.resizeSelect)
                    Layout.resizeSelect(this.elements.askModelSelect);
            }
        }

        updateModelOptions(options, selectedValue) {
            const select = this.elements.askModelSelect;
            if (!select) return;

            select.innerHTML = '';
            options.forEach((option) => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                select.appendChild(optionElement);
            });

            // Select value if valid, otherwise first option
            if (selectedValue && options.some((option) => option.value === selectedValue)) {
                select.value = selectedValue;
            } else if (options.length > 0) {
                select.value = options[0].value;
            }

            const Layout = window.GeminiViewLayout;
            if (Layout && Layout.resizeSelect) Layout.resizeSelect(select);
        }

        // --- General ---

        isHost(target, host) {
            return target === host || this.windowView.isHost(target);
        }
    }

    window.GeminiToolbarView = ToolbarView;
})();
