(function () {
    const DEFAULT_WEB_MODEL = '8c46e95b1a07cecc';

    const WEB_MODEL_OPTIONS = [
        { value: '8c46e95b1a07cecc', label: '3.1 Flash-Lite' },
        { value: '56fdd199312815e2', label: '3.5 Flash' },
        { value: 'e6fa609c3fa255c0', label: '3.1 Pro' },
    ];

    function createOptions() {
        return WEB_MODEL_OPTIONS.map((option) => ({ ...option }));
    }

    function createOptionMarkup() {
        return WEB_MODEL_OPTIONS.map(
            (option) => `<option value="${option.value}">${option.label}</option>`
        ).join('');
    }

    function resolveImagePromptModel({ provider = 'web', mode, model } = {}) {
        return model || DEFAULT_WEB_MODEL;
    }

    window.GeminiWebModels = {
        DEFAULT_WEB_MODEL,
        createOptions,
        createOptionMarkup,
        resolveImagePromptModel,
    };
})();
