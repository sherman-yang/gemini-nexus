import { resizeSelectToSelectedOption } from '../ui/model_select_width.js';
import { initModelPicker, syncModelPicker } from '../ui/model_picker.js';

function bindModelSelect(app, ui, setResizeRef) {
    const modelSelect = document.getElementById('model-select');
    const modelPicker = initModelPicker(modelSelect);
    let resizeModelSelectFrame = null;
    const resizeModelSelect = () => {
        if (resizeModelSelectFrame !== null) return;

        resizeModelSelectFrame = window.requestAnimationFrame(() => {
            resizeModelSelectFrame = null;

            if (ui.resizeModelSelect) {
                ui.resizeModelSelect();
                return;
            }

            resizeSelectToSelectedOption(modelSelect);
            syncModelPicker(modelSelect);
        });
    };

    if (setResizeRef) setResizeRef(resizeModelSelect);

    if (modelSelect) {
        modelSelect.addEventListener('change', (changeEvent) => {
            app.handleModelChange(changeEvent.target.value);
            modelPicker?.sync();
            resizeModelSelect();
        });
        setTimeout(resizeModelSelect, 50);
    }

    return modelSelect;
}

function cycleModelSelect(modelSelect, keyEvent) {
    if (!modelSelect) return;
    const direction = keyEvent.shiftKey ? -1 : 1;
    const newIndex =
        (modelSelect.selectedIndex + direction + modelSelect.length) % modelSelect.length;
    modelSelect.selectedIndex = newIndex;
    modelSelect.dispatchEvent(new Event('change'));
}

export function bindInputEvents(app, ui, setResizeRef) {
    const modelSelect = bindModelSelect(app, ui, setResizeRef);
    const inputFn = document.getElementById('prompt');
    const sendBtn = document.getElementById('send');

    if (inputFn && sendBtn) {
        inputFn.addEventListener('keydown', (keyEvent) => {
            if (keyEvent.key === 'Tab') {
                keyEvent.preventDefault();
                cycleModelSelect(modelSelect, keyEvent);
                return;
            }

            if (keyEvent.key === 'Enter' && !keyEvent.shiftKey && !keyEvent.isComposing) {
                keyEvent.preventDefault();
                sendBtn.click();
            }
        });

        sendBtn.addEventListener('click', () => {
            if (app.isGenerating) {
                app.handleCancel();
            } else {
                app.handleSendMessage();
            }
        });
    }

    document.addEventListener('keydown', (keyEvent) => {
        if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key.toLowerCase() === 'p') {
            keyEvent.preventDefault();
            if (inputFn) inputFn.focus();
        }
    });
}
