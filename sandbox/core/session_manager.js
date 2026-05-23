import { generateUUID } from '../../shared/utils/index.js';
import {
    getImageAttachmentDataUrls,
    normalizeUserAttachments,
} from '../../shared/attachments/index.js';

export class SessionManager {
    constructor() {
        this.sessions = [];
        this.currentSessionId = null;
    }

    createSession() {
        const newId = generateUUID();
        const newSession = {
            id: newId,
            title: 'New Chat',
            timestamp: Date.now(),
            messages: [],
            context: null, // Gemini context IDs
        };
        this.sessions.unshift(newSession);
        this.currentSessionId = newId;
        return newSession;
    }

    setSessions(sessions) {
        this.sessions = this.filterPersistableSessions(sessions || []);
        if (this.currentSessionId && !this.getSessionById(this.currentSessionId)) {
            this.currentSessionId = null;
        }
    }

    getCurrentSession() {
        return this.getSessionById(this.currentSessionId);
    }

    getSortedSessions() {
        return this.getPersistableSessions().sort(
            (leftSession, rightSession) => rightSession.timestamp - leftSession.timestamp
        );
    }

    setCurrentId(id) {
        this.currentSessionId = this.getSessionById(id) ? id : null;
    }

    enterDraft() {
        this.currentSessionId = null;
    }

    getSessionById(id) {
        if (!id) return null;
        return this.sessions.find((session) => session.id === id) || null;
    }

    getPersistableSessions() {
        return this.filterPersistableSessions(this.sessions);
    }

    filterPersistableSessions(sessions) {
        if (!Array.isArray(sessions)) return [];
        return sessions.filter((session) => !this.isDiscardableBlankSession(session));
    }

    isDiscardableBlankSession(session) {
        if (!session || typeof session !== 'object') return true;
        const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
        return messageCount === 0;
    }

    deleteSession(id) {
        this.sessions = this.sessions.filter((session) => session.id !== id);
        const wasCurrent = this.currentSessionId === id;
        if (wasCurrent) {
            this.currentSessionId = this.sessions.length > 0 ? this.sessions[0].id : null;
        }
        return wasCurrent;
    }

    updateTitle(id, text) {
        const session = this.sessions.find((storedSession) => storedSession.id === id);
        if (session) {
            const cleanText = (text || '').replace(/[\r\n]+/g, ' ').trim();
            if (cleanText) {
                session.title = cleanText.substring(0, 30) + (cleanText.length > 30 ? '...' : '');
                return true;
            }
        }
        return false;
    }

    addMessage(id, role, text, attachment = null, thoughts = null) {
        const session = this.sessions.find((storedSession) => storedSession.id === id);
        if (session) {
            const sessionMessage = { role, text };

            if (thoughts) {
                sessionMessage.thoughts = thoughts;
            }

            if (role === 'user') {
                const attachments = normalizeUserAttachments(attachment);
                if (attachments.length > 0) {
                    sessionMessage.attachments = attachments;
                    const images = getImageAttachmentDataUrls(attachments);
                    if (images.length > 0) {
                        sessionMessage.image = images;
                    }
                }
            } else if (role === 'ai' && Array.isArray(attachment) && attachment.length > 0) {
                sessionMessage.generatedImages = attachment;
            }

            session.messages.push(sessionMessage);
            session.timestamp = Date.now();
            return true;
        }
        return false;
    }

    editUserMessageAndTruncate(id, messageIndex, text) {
        const session = this.sessions.find((storedSession) => storedSession.id === id);
        if (!session || !Array.isArray(session.messages)) return null;

        const target = session.messages[messageIndex];
        if (!target || target.role !== 'user') return null;

        const previousMessages = session.messages.slice(0, messageIndex);
        const editedMessage = {
            ...target,
            text,
        };

        session.messages = [...previousMessages, editedMessage];
        session.context = null;
        session.contextSummary = null;
        session.timestamp = Date.now();

        if (messageIndex === 0) {
            this.updateTitle(id, text);
        }

        return {
            session,
            message: editedMessage,
            previousMessages,
        };
    }

    updateContext(id, context) {
        const session = this.sessions.find((storedSession) => storedSession.id === id);
        if (session) {
            session.context = context;
        }
    }
}
