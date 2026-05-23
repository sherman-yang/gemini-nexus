(function () {
    /**
     * Handles the rendering of results in the toolbar window,
     * including Markdown transformation (via Bridge) and Generated Images grid.
     */
    class UIRenderer {
        constructor(view, bridge) {
            this.view = view;
            this.bridge = bridge;
            this.currentResultText = '';
        }

        /**
         * Renders the text result and optionally processes generated images.
         */
        async show(text, title, isStreaming, images = []) {
            this.currentResultText = text;

            let renderedHtml = text;
            let imageFetchTasks = [];

            if (this.bridge) {
                try {
                    const renderResult = await this.bridge.render(text, isStreaming ? [] : images);
                    renderedHtml = renderResult.html;
                    imageFetchTasks = renderResult.fetchTasks || [];
                } catch {
                    console.warn('Bridge render failed, falling back to simple escape');
                    renderedHtml = text
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>');
                }
            }

            this.view.showResult(renderedHtml, title, isStreaming);

            if (imageFetchTasks.length > 0) {
                this._executeImageFetchTasks(imageFetchTasks);
            }
        }

        _executeImageFetchTasks(tasks) {
            const container = this.view.elements.resultText;
            if (!container) return;

            tasks.forEach((task) => {
                const imageElement = container.querySelector(`img[data-req-id="${task.reqId}"]`);
                if (imageElement) {
                    chrome.runtime.sendMessage({
                        action: 'FETCH_GENERATED_IMAGE',
                        url: task.url,
                        reqId: task.reqId,
                    });
                }
            });
        }

        handleGeneratedImageResult(request) {
            const container = this.view.elements.resultText;
            if (!container) return;

            const imageElement = container.querySelector(`img[data-req-id="${request.reqId}"]`);
            if (imageElement) {
                if (request.base64) {
                    imageElement.src = request.base64;
                    imageElement.classList.remove('loading');
                    imageElement.style.minHeight = 'auto';
                } else {
                    imageElement.style.background = '#ffebee';
                    imageElement.alt = 'Failed to load';
                }
            }
        }

        get currentText() {
            return this.currentResultText;
        }
    }

    window.GeminiUIRenderer = UIRenderer;
})();
