import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRequestParams } from '../../services/auth.js';
import { AuthManager } from './auth_manager.js';

vi.mock('../../services/auth.js', () => ({
    fetchRequestParams: vi.fn(),
}));

describe('AuthManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.chrome = {
            storage: {
                local: {
                    set: vi.fn(async () => {}),
                },
            },
        };
    });

    it('refreshes cached Web context that predates current upload token fields', async () => {
        fetchRequestParams.mockResolvedValue({
            atValue: 'fresh-at',
            blValue: 'fresh-bl',
            fSid: 'fresh-fsid',
            locale: 'zh-CN',
            authUserIndex: '2',
            uploadPushId: 'feeds/upload-dynamic',
            uploadClientPctx: 'client-pctx-token',
        });

        const manager = new AuthManager();
        manager.currentContext = {
            atValue: 'cached-at',
            blValue: 'cached-bl',
            fSid: 'cached-fsid',
            locale: 'zh-CN',
            authUser: '2',
            contextIds: ['conversation', 'response', 'choice'],
        };
        manager.accountIndices = ['2'];

        await expect(manager.getOrFetchContext()).resolves.toEqual({
            atValue: 'fresh-at',
            blValue: 'fresh-bl',
            fSid: 'fresh-fsid',
            locale: 'zh-CN',
            authUser: '2',
            uploadPushId: 'feeds/upload-dynamic',
            uploadClientPctx: 'client-pctx-token',
        });
        expect(fetchRequestParams).toHaveBeenCalledWith('2');
    });

    it('refreshes cached Web context that is missing the current bl request token', async () => {
        fetchRequestParams.mockResolvedValue({
            atValue: 'fresh-at',
            blValue: 'fresh-bl',
            fSid: 'fresh-fsid',
            locale: 'zh-CN',
            authUserIndex: '0',
            uploadPushId: 'feeds/upload-dynamic',
            uploadClientPctx: 'client-pctx-token',
        });

        const manager = new AuthManager();
        manager.currentContext = {
            atValue: 'cached-at',
            fSid: 'cached-fsid',
            locale: 'zh-CN',
            authUser: '0',
            uploadPushId: 'feeds/upload-dynamic',
            uploadClientPctx: 'client-pctx-token',
        };

        await expect(manager.getOrFetchContext()).resolves.toEqual({
            atValue: 'fresh-at',
            blValue: 'fresh-bl',
            fSid: 'fresh-fsid',
            locale: 'zh-CN',
            authUser: '0',
            uploadPushId: 'feeds/upload-dynamic',
            uploadClientPctx: 'client-pctx-token',
        });
        expect(fetchRequestParams).toHaveBeenCalledWith('0');
    });

    it('persists auth context without overwriting the selected model preference', async () => {
        const manager = new AuthManager();
        const context = {
            atValue: 'at-token',
            blValue: 'bl-token',
            fSid: 'fsid-token',
            locale: 'zh-CN',
            authUser: '0',
            uploadPushId: 'feeds/upload-dynamic',
            uploadClientPctx: 'client-pctx-token',
            contextIds: ['stale-conversation', 'stale-response', 'stale-choice'],
        };
        const expectedContext = {
            atValue: 'at-token',
            blValue: 'bl-token',
            fSid: 'fsid-token',
            locale: 'zh-CN',
            authUser: '0',
            uploadPushId: 'feeds/upload-dynamic',
            uploadClientPctx: 'client-pctx-token',
        };

        await manager.updateContext(context, 'gemini-3-pro');

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            geminiContext: expectedContext,
        });
        expect(chrome.storage.local.set.mock.calls[0][0]).not.toHaveProperty('geminiModel');
        expect(manager.currentContext).toEqual(expectedContext);
    });
});
