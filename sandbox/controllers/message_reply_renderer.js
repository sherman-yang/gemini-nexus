import { appendMessage } from '../render/message.js';
import { hasMatchingReplyMedia } from './message_matchers.js';

export class MessageReplyRenderState {
    constructor() {
        this.storageRenderedMessageCounts = new Map();
    }

    hasPersistedAiReply(session, request) {
        if (!session || !Array.isArray(session.messages) || session.messages.length === 0) {
            return false;
        }

        const lastMessage = session.messages[session.messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'ai') return false;

        const expectedText = request.text || '';
        const actualText = lastMessage.text || '';
        const mediaMatches = hasMatchingReplyMedia(lastMessage, request);
        const textMatches = expectedText
            ? actualText === expectedText || actualText.startsWith(expectedText)
            : actualText.length > 0 || mediaMatches;
        if (!textMatches) return false;

        if (request.thoughts) {
            const actualThoughts = lastMessage.thoughts || '';
            return (
                actualThoughts === request.thoughts || actualThoughts.startsWith(request.thoughts)
            );
        }

        return true;
    }

    markSessionRenderedFromStorage(sessionId, messageCount) {
        if (!sessionId || !Number.isInteger(messageCount)) return;
        this.storageRenderedMessageCounts.set(sessionId, messageCount);
    }

    hasStorageRenderedAiReply(session, request) {
        if (!session || !session.id) return false;
        const renderedCount = this.storageRenderedMessageCounts.get(session.id);
        if (!Number.isInteger(renderedCount)) return false;
        if (!Array.isArray(session.messages) || renderedCount < session.messages.length) {
            return false;
        }
        return this.hasPersistedAiReply(session, request);
    }
}

export function renderGeminiReply(handler, session, request) {
    if (!session) return;

    if (request.status === 'success') {
        handler.sessionManager.updateContext(session.id, request.context);
    }

    if (handler.streamingBubble) {
        if (handler.hasStorageRenderedAiReply(session, request)) {
            handler.resetStream({ remove: true });
            return;
        }

        handler.streamingBubble.finalize(request.text, request.thoughts, {
            thoughtsDurationSeconds: request.thoughtsDurationSeconds,
        });

        if (request.images && request.images.length > 0) {
            handler.streamingBubble.addImages(request.images);
        }

        if (request.sources && request.sources.length > 0) {
            handler.streamingBubble.addSources(request.sources);
        }

        handler.streamingBubble = null;
        return;
    }

    if (handler.hasStorageRenderedAiReply(session, request)) {
        return;
    }

    appendMessage(
        handler.ui.historyDiv,
        request.text,
        'ai',
        request.images,
        request.thoughts,
        request.sources,
        {
            isFinal: true,
            thoughtsDurationSeconds: request.thoughtsDurationSeconds,
        }
    );
}
