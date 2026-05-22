import {
    countUserAttachmentsByType,
    getImageAttachmentDataUrls,
    normalizeUserAttachments,
} from '../../shared/attachments/index.js';

export function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || '').replace(/\/$/, '');
}

function getMessageAttachments(message) {
    if (message?.role !== 'user') return [];
    const attachments = normalizeUserAttachments(message?.attachments);
    if (attachments.length > 0) return attachments;
    return normalizeUserAttachments(message?.image);
}

function getUnsupportedFileAttachments(attachments) {
    return normalizeUserAttachments(attachments).filter(
        (attachment) => !attachment.type.startsWith('image/')
    );
}

export function assertCurrentAttachmentsSupported(files) {
    const counts = countUserAttachmentsByType(files);
    if (counts.files === 0) return;

    throw new Error(
        'OpenAI Compatible API supports image attachments only. Remove non-image files or switch to Gemini Official/Web.'
    );
}

function textWithUnsupportedFileNotice(text, attachments) {
    const unsupported = getUnsupportedFileAttachments(attachments);
    if (unsupported.length === 0) return text || '';

    const names = unsupported
        .map((attachment) => attachment.name)
        .filter(Boolean)
        .join(', ');
    const suffix = names ? `: ${names}` : '';
    const marker = `[${unsupported.length} unsupported file attachment(s) omitted${suffix}]`;
    return [text, marker].filter(Boolean).join('\n');
}

function buildOpenAIContent(text, images) {
    if (!images || images.length === 0) {
        return text || '';
    }

    const content = [];
    if (text) {
        content.push({ type: 'text', text });
    }

    images.forEach((img) => {
        content.push({
            type: 'image_url',
            image_url: {
                url: img,
            },
        });
    });

    return content;
}

function buildOpenAIUserContent(text, attachments) {
    const normalizedAttachments = normalizeUserAttachments(attachments);
    return buildOpenAIContent(
        textWithUnsupportedFileNotice(text, normalizedAttachments),
        getImageAttachmentDataUrls(normalizedAttachments)
    );
}

function buildResponsesContent(text, images) {
    if (!images || images.length === 0) {
        return text || '';
    }

    const content = [];
    if (text) {
        content.push({ type: 'input_text', text });
    }

    images.forEach((img) => {
        content.push({
            type: 'input_image',
            image_url: img,
        });
    });

    return content;
}

function buildResponsesUserContent(text, attachments) {
    const normalizedAttachments = normalizeUserAttachments(attachments);
    return buildResponsesContent(
        textWithUnsupportedFileNotice(text, normalizedAttachments),
        getImageAttachmentDataUrls(normalizedAttachments)
    );
}

export function buildChatMessages(prompt, systemInstruction, history, files) {
    const messages = [];

    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }

    if (Array.isArray(history)) {
        history.forEach((msg) => {
            const attachments = getMessageAttachments(msg);
            messages.push({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content:
                    msg.role === 'user'
                        ? buildOpenAIUserContent(msg.text, attachments)
                        : buildOpenAIContent(msg.text, []),
            });
        });
    }

    messages.push({
        role: 'user',
        content: buildOpenAIUserContent(prompt, files),
    });

    return messages;
}

export function buildResponsesInput(prompt, history, files) {
    const input = [];

    if (Array.isArray(history)) {
        history.forEach((msg) => {
            const attachments = getMessageAttachments(msg);
            input.push({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content:
                    msg.role === 'user'
                        ? buildResponsesUserContent(msg.text, attachments)
                        : buildResponsesContent(msg.text, []),
            });
        });
    }

    input.push({
        role: 'user',
        content: buildResponsesUserContent(prompt, files),
    });

    return input;
}
