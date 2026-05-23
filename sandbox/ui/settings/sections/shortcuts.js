import { getSettingsElement } from '../dom.js';

export class ShortcutsSection {
    constructor() {
        this.elements = {};
        this.queryElements();
        this.bindEvents();
    }

    queryElements() {
        this.elements = {
            inputQuickAsk: getSettingsElement('shortcut-quick-ask'),
            inputOpenPanel: getSettingsElement('shortcut-open-panel'),
            inputBrowserControl: getSettingsElement('shortcut-browser-control'),
            inputOcrCapture: getSettingsElement('shortcut-ocr-capture'),
        };
    }

    bindEvents() {
        this.setupShortcutInput(this.elements.inputQuickAsk);
        this.setupShortcutInput(this.elements.inputOpenPanel);
        this.setupShortcutInput(this.elements.inputBrowserControl);
        this.setupShortcutInput(this.elements.inputOcrCapture);
    }

    setupShortcutInput(inputEl) {
        if (!inputEl) return;
        inputEl.addEventListener('keydown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;

            const keys = [];
            if (event.ctrlKey) keys.push('Ctrl');
            if (event.altKey) keys.push('Alt');
            if (event.shiftKey) keys.push('Shift');
            if (event.metaKey) keys.push('Meta');

            let normalizedKey = event.key.toUpperCase();
            if (normalizedKey === ' ') normalizedKey = 'Space';
            keys.push(normalizedKey);

            inputEl.value = keys.join('+');
        });
    }

    setData(shortcuts) {
        if (this.elements.inputQuickAsk) this.elements.inputQuickAsk.value = shortcuts.quickAsk;
        if (this.elements.inputOpenPanel) this.elements.inputOpenPanel.value = shortcuts.openPanel;
        if (this.elements.inputBrowserControl) {
            this.elements.inputBrowserControl.value = shortcuts.browserControl || 'Ctrl+B';
        }
        if (this.elements.inputOcrCapture) {
            this.elements.inputOcrCapture.value = shortcuts.ocrCapture || 'Alt+O';
        }
    }

    getData() {
        const { inputQuickAsk, inputOpenPanel, inputBrowserControl, inputOcrCapture } =
            this.elements;
        return {
            quickAsk: inputQuickAsk ? inputQuickAsk.value : null,
            openPanel: inputOpenPanel ? inputOpenPanel.value : null,
            browserControl: inputBrowserControl ? inputBrowserControl.value : 'Ctrl+B',
            ocrCapture: inputOcrCapture ? inputOcrCapture.value : 'Alt+O',
        };
    }
}
