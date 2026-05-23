(function () {
    class GeminiImageDetector {
        constructor(callbacks) {
            this.callbacks = callbacks || {}; // { onShow, onHide }
            this.hoveredImage = null;
            this.imageButtonTimeout = null;
            this.isEnabled = false;

            this.onImageHover = this.onImageHover.bind(this);
        }

        setEnabled(enabled) {
            if (this.isEnabled === enabled) return;
            this.isEnabled = enabled;

            if (enabled) {
                document.addEventListener('mouseover', this.onImageHover, true);
                document.addEventListener('mouseout', this.onImageHover, true);
            } else {
                document.removeEventListener('mouseover', this.onImageHover, true);
                document.removeEventListener('mouseout', this.onImageHover, true);
                this.scheduleHide(0);
            }
        }

        onImageHover(mouseEvent) {
            if (!this.isEnabled) return;
            const isEnter = mouseEvent.type === 'mouseover';

            if (mouseEvent.target.tagName !== 'IMG') return;

            // Ignore small images (icons, spacers)
            const imageElement = mouseEvent.target;
            if (imageElement.width < 100 || imageElement.height < 100) return;

            if (isEnter) {
                if (this.imageButtonTimeout) clearTimeout(this.imageButtonTimeout);
                this.hoveredImage = imageElement;
                const imageRect = imageElement.getBoundingClientRect();

                if (this.callbacks.onShow) {
                    this.callbacks.onShow(imageRect);
                }
            } else {
                this.scheduleHide();
            }
        }

        scheduleHide(delay = 200) {
            if (this.imageButtonTimeout) clearTimeout(this.imageButtonTimeout);
            this.imageButtonTimeout = setTimeout(() => {
                if (this.callbacks.onHide) {
                    this.callbacks.onHide();
                }
                this.hoveredImage = null;
            }, delay);
        }

        cancelHide() {
            if (this.imageButtonTimeout) clearTimeout(this.imageButtonTimeout);
        }

        getCurrentImage() {
            return this.hoveredImage;
        }
    }

    window.GeminiImageDetector = GeminiImageDetector;
})();
