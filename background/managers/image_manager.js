export class ImageManager {
    async fetchImage(url) {
        try {
            if (url.startsWith('data:')) {
                const matches = url.match(/^data:(.+);base64,(.+)$/);
                if (matches) {
                    return {
                        action: 'FETCH_IMAGE_RESULT',
                        base64: url,
                        type: matches[1],
                        name: 'dropped_image.png',
                    };
                }
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Fetch failed: ' + response.statusText);

            const blob = await response.blob();
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            return {
                action: 'FETCH_IMAGE_RESULT',
                base64,
                type: blob.type,
                name: 'web_image.png',
            };
        } catch (error) {
            return {
                action: 'FETCH_IMAGE_RESULT',
                error: error.message,
            };
        }
    }

    _captureTab(windowId) {
        return new Promise((resolve) => {
            // Use explicit windowId if provided to ensure correct window is captured
            chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
                if (chrome.runtime.lastError || !dataUrl) {
                    console.error('Capture failed:', chrome.runtime.lastError);
                    resolve(null);
                } else {
                    resolve(dataUrl);
                }
            });
        });
    }

    async captureScreenshot(windowId) {
        const dataUrl = await this._captureTab(windowId);

        if (!dataUrl) {
            return {
                action: 'FETCH_IMAGE_RESULT',
                error: 'Capture failed',
            };
        }

        return {
            action: 'FETCH_IMAGE_RESULT',
            base64: dataUrl,
            type: 'image/png',
            name: 'screenshot.png',
        };
    }

    async captureArea(area, windowId) {
        const dataUrl = await this._captureTab(windowId);

        if (!dataUrl) {
            return null;
        }

        return {
            action: 'CROP_SCREENSHOT',
            image: dataUrl,
            area: area,
        };
    }
}
