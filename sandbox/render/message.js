import { renderContent } from './content.js';
import { createCopyButton } from './copy_button.js';
import { createMessageEditControl } from './message_edit.js';
import { createGeneratedImagesGrid, createUserImagesGrid } from './message_media.js';
import { getMessageSpacingKind, isToolMessageKind, syncMessageSpacing } from './message_spacing.js';
import { cleanupStructuredSourceText, createSourcesElement } from './sources.js';
import { createThoughtsBlock } from './thoughts_block.js';
import { hasDisplayableText } from '../core/displayable_content.js';

// Appends a message to the chat history and returns an update controller
// attachment can be:
// - string: single user image (URL/Base64)
// - array of strings: multiple user images
// - array of objects {url, alt}: AI generated images
export function appendMessage(
    container,
    text,
    role,
    attachment = null,
    thoughts = null,
    sources = null,
    options = {}
) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    if (options.kind) div.classList.add(`msg-${options.kind}`);
    if (options.toolOutputKey) div.dataset.toolOutputKey = options.toolOutputKey;
    if (options.toolStatusKey) div.dataset.toolStatusKey = options.toolStatusKey;

    // Store current text state
    let currentText = text || '';
    let currentThoughts = thoughts || '';

    // User-uploaded images render before message text.
    if (role === 'user' && attachment) {
        const imagesContainer = createUserImagesGrid(attachment);
        if (imagesContainer) {
            div.appendChild(imagesContainer);
        }
    }

    let contentDiv = null;
    let thoughtsController = null;
    let sourcesDiv = null;
    let editController = null;
    let copyBtn = null;
    let currentSources = Array.isArray(sources) ? sources : [];

    const renderMessageContent = () => {
        if (!contentDiv) return;
        const renderRole = isToolMessageKind(options.kind) ? options.kind : role;
        const displayText =
            renderRole === 'ai'
                ? cleanupStructuredSourceText(currentText, currentSources)
                : currentText;
        const hideEmptyAiContent = renderRole === 'ai' && !hasDisplayableText(displayText);
        contentDiv.hidden = hideEmptyAiContent;
        if (hideEmptyAiContent) {
            contentDiv.innerHTML = '';
            return;
        }
        renderContent(contentDiv, displayText, renderRole, options);
    };

    const getVisibleMessageText = () => {
        return role === 'ai'
            ? cleanupStructuredSourceText(currentText, currentSources)
            : currentText;
    };

    const hasCopyableMessageText = () => {
        if (isToolMessageKind(options.kind)) return false;
        if (options.suppressCopy === true) return false;
        return hasDisplayableText(getVisibleMessageText());
    };

    const getCopyText = () => {
        return getVisibleMessageText();
    };

    const getSpacingKind = () => {
        return getMessageSpacingKind({
            kind: options.kind,
            role,
            thoughts: currentThoughts,
            visibleText: getVisibleMessageText(),
        });
    };

    const syncCompactSpacing = ({ skipNext = false } = {}) => {
        syncMessageSpacing(container, div, getSpacingKind, { skipNext });
    };

    const syncCopyButton = () => {
        const shouldShowCopy = hasCopyableMessageText();
        if (shouldShowCopy && !copyBtn) {
            copyBtn = createCopyButton(getCopyText);
            div.appendChild(copyBtn);
            return;
        }
        if (!shouldShowCopy && copyBtn) {
            copyBtn.remove();
            copyBtn = null;
        }
    };

    const updateThoughts = (nextThoughts, state = {}) => {
        if (nextThoughts !== undefined) {
            currentThoughts = nextThoughts || '';
        }

        thoughtsController?.update(nextThoughts, state);
        syncCompactSpacing();
    };

    // Allow creating empty AI bubbles for streaming
    if (currentText || currentThoughts || role === 'ai' || role === 'user') {
        // --- Thinking Process (Optional) ---
        if (role === 'ai') {
            thoughtsController = createThoughtsBlock(currentThoughts, options, syncCompactSpacing);
            div.appendChild(thoughtsController.root);
            updateThoughts(undefined, {
                isStreaming: options.isStreaming,
                isFinal: options.isFinal,
            });
        }

        contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';
        renderMessageContent();
        div.appendChild(contentDiv);

        if (role === 'ai' && Array.isArray(sources) && sources.length > 0) {
            sourcesDiv = createSourcesElement(sources);
            if (sourcesDiv) {
                div.appendChild(sourcesDiv);
            }
        }

        // AI-generated images are distinct from user attachments.
        if (role === 'ai') {
            const grid = createGeneratedImagesGrid(attachment);
            if (grid) div.appendChild(grid);
        }

        syncCopyButton();
        syncCompactSpacing();

        if (
            role === 'user' &&
            !isToolMessageKind(options.kind) &&
            typeof options.onEdit === 'function'
        ) {
            editController = createMessageEditControl({
                messageEl: div,
                contentEl: contentDiv,
                getCopyButton: () => copyBtn,
                getCurrentText: () => currentText,
                onEdit: options.onEdit,
            });

            div.appendChild(editController.button);
        }
    }

    container.appendChild(div);
    syncCompactSpacing();

    // --- Scroll Logic ---
    // Instead of scrolling to bottom, we scroll to the top of the NEW message.
    // This allows users to read from the start while content streams in below.
    // Restored history renders disable this and let the session flow choose one
    // final scroll position after all messages are rebuilt.
    if (options.autoScroll !== false) {
        setTimeout(() => {
            const topPos = div.offsetTop - 20; // 20px padding context
            container.scrollTo({
                top: topPos,
                behavior: 'smooth',
            });
        }, 10);
    }

    const controller = {
        div,
        update: (newText, newThoughts, state = {}) => {
            if (newText !== undefined) {
                currentText = newText;
                if (state.toolStatus !== undefined) {
                    options.toolStatus = state.toolStatus;
                }
                if (state.isCollapsed !== undefined) {
                    options.isCollapsed = state.isCollapsed;
                }
                if (state.toolCallText !== undefined) {
                    options.toolCallText = state.toolCallText;
                }
                if (state.callIndex !== undefined) {
                    options.callIndex = state.callIndex;
                }
                if (state.callCount !== undefined) {
                    options.callCount = state.callCount;
                }
                if (state.suppressCopy !== undefined) {
                    options.suppressCopy = state.suppressCopy === true;
                }
                renderMessageContent();
                syncCopyButton();
            }

            const displayText = getVisibleMessageText();
            updateThoughts(newThoughts, {
                ...state,
                hasDisplayableText: hasDisplayableText(displayText),
            });
            syncCompactSpacing();

            // Note: We removed the auto-scroll-to-bottom logic here.
            // If the user is at the start of the message, we want them to stay there
            // as the content expands downwards.
        },
        finalize: (newText, newThoughts, state = {}) => {
            if (newText !== undefined) {
                currentText = newText;
                if (state.suppressCopy !== undefined) {
                    options.suppressCopy = state.suppressCopy === true;
                }
                renderMessageContent();
                syncCopyButton();
            }
            if (Number.isFinite(state.thoughtsDurationSeconds)) {
                thoughtsController?.setDurationSeconds(state.thoughtsDurationSeconds);
            }
            updateThoughts(newThoughts, { isFinal: true });
            syncCompactSpacing();
        },
        syncCompactSpacing,
        getThoughtsDurationSeconds: () => thoughtsController?.getDurationSeconds() ?? null,
        dispose: () => {
            thoughtsController?.dispose();
            editController?.cancel();
        },
        // Add generated images if they arrive after the text response.
        addImages: (images) => {
            if (
                Array.isArray(images) &&
                images.length > 0 &&
                !div.querySelector('.generated-images-grid')
            ) {
                const grid = createGeneratedImagesGrid(images);
                if (!grid) return;

                // Insert before copy button
                div.insertBefore(grid, div.querySelector('.copy-btn'));
                // Do not force scroll here either
            }
        },
        addSources: (sourceList) => {
            if (sourcesDiv || !Array.isArray(sourceList) || sourceList.length === 0) return;
            currentSources = sourceList;
            renderMessageContent();
            syncCopyButton();
            syncCompactSpacing();

            const builtSources = createSourcesElement(sourceList);
            if (!builtSources) return;

            sourcesDiv = builtSources;
            const copyBtn = div.querySelector('.copy-btn');
            if (copyBtn) {
                div.insertBefore(sourcesDiv, copyBtn);
            } else {
                div.appendChild(sourcesDiv);
            }
        },
    };
    div.__messageController = controller;
    return controller;
}
