// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendMessage } from './message.js';

vi.mock('./content.js', () => ({
    renderContent: vi.fn((contentDiv, text) => {
        contentDiv.textContent = text || '';
    }),
}));

vi.mock('./clipboard.js', () => ({
    copyToClipboard: vi.fn(),
}));

vi.mock('./generated_image.js', () => ({
    createGeneratedImage: vi.fn(() => document.createElement('img')),
}));

vi.mock('../core/i18n.js', () => ({
    t: (key) => key,
}));

describe('appendMessage copy button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not show a copy button when a streaming AI update has no visible text', () => {
        const container = document.createElement('div');
        const controller = appendMessage(container, '', 'ai', null, '', null, {
            isStreaming: true,
            autoScroll: false,
        });

        controller.update('', undefined, { isStreaming: true });

        expect(container.querySelector('.copy-btn')).toBeNull();
    });

    it('shows and removes the copy button as visible AI text appears and disappears', () => {
        const container = document.createElement('div');
        const controller = appendMessage(container, '', 'ai', null, '', null, {
            isStreaming: true,
            autoScroll: false,
        });

        controller.update('Visible answer', undefined, { isStreaming: true });
        expect(container.querySelector('.copy-btn')).not.toBeNull();

        controller.update('', undefined, { isStreaming: true });
        expect(container.querySelector('.copy-btn')).toBeNull();
    });

    it('hides the copy button when an intermediate AI message suppresses copying', () => {
        const container = document.createElement('div');
        const controller = appendMessage(container, '', 'ai', null, 'thinking', null, {
            isStreaming: true,
            autoScroll: false,
        });

        controller.update('I will call a tool now.', undefined, { isStreaming: true });
        expect(container.querySelector('.copy-btn')).not.toBeNull();

        controller.finalize('I will call a tool now.', undefined, { suppressCopy: true });
        expect(container.querySelector('.copy-btn')).toBeNull();
        expect(container.querySelector('.msg-content')?.textContent).toBe(
            'I will call a tool now.'
        );
    });

    it('uses AMC-style rows, action rails, and content containers for normal messages', () => {
        const container = document.createElement('div');

        const aiController = appendMessage(container, 'Assistant answer', 'ai', null, '', null, {
            autoScroll: false,
        });
        const userController = appendMessage(container, 'User question', 'user', null, '', null, {
            autoScroll: false,
            onEdit: vi.fn(),
        });

        const aiRow = aiController.div.querySelector(':scope > .msg-row');
        expect(aiController.div.dataset.messageRole).toBe('model');
        expect(aiRow?.children[0]?.classList.contains('message-action-rail')).toBe(true);
        expect(aiRow?.children[1]?.classList.contains('message-content-container')).toBe(true);
        expect(aiController.div.querySelector('.message-avatar-ai')).not.toBeNull();
        expect(aiController.div.querySelector('.message-actions .copy-btn')).not.toBeNull();
        expect(aiController.div.querySelector(':scope > .copy-btn')).toBeNull();

        const userRow = userController.div.querySelector(':scope > .msg-row');
        expect(userController.div.dataset.messageRole).toBe('user');
        expect(userRow?.children[0]?.classList.contains('message-content-container')).toBe(true);
        expect(userRow?.children[1]?.classList.contains('message-action-rail')).toBe(true);
        expect(userController.div.querySelector('.message-avatar-user')).not.toBeNull();
        expect(userController.div.querySelector('.message-actions .copy-btn')).not.toBeNull();
        expect(userController.div.querySelector('.message-actions .edit-btn')).not.toBeNull();
    });
});
