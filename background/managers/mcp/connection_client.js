import { inferTransport, mergeHeaders, normalizeHeaders, stableHeadersKey } from './transport.js';
import { handleIncomingRpcMessage } from './rpc_messages.js';
import { sendStreamableHttpRpc } from './streamable_http.js';
import { initializeMcpHandshake } from './handshake.js';
import {
    bumpMcpIdleClose,
    createMcpConnectionState,
    disconnectMcpConnectionState,
    rejectPendingMcpRequests,
} from './connection_state.js';
import { ensureWebSocketConnected } from './websocket_connection.js';
import { ensureSseConnected } from './sse_connection.js';
import { ensureStreamableHttpConnected } from './streamable_http_connection.js';

export class McpConnectionClient {
    constructor({ clientName = 'gemini-nexus', clientVersion = '0.0.0' } = {}) {
        this.clientName = clientName;
        this.clientVersion = clientVersion;
        this.connections = new Map();
        this.nextId = 1;
    }

    async disconnect(serverId) {
        if (serverId) {
            const conn = this.connections.get(serverId);
            if (conn) {
                this._disconnectState(conn);
                this.connections.delete(serverId);
            }
            return;
        }

        for (const conn of this.connections.values()) {
            this._disconnectState(conn);
        }
        this.connections.clear();
    }

    async sendRpc(conn, method, params) {
        if (conn.transport === 'streamable-http') {
            return sendStreamableHttpRpc(conn, method, params, {
                nextId: () => this.nextId++,
                initializeHandshake: () => this._initializeHandshake(conn),
                onMessage: (message) => this._handleIncomingRpcMessage(conn, message),
            });
        }

        if (conn.transport === 'ws') {
            if (!conn.ws || conn.ws.readyState !== WebSocket.OPEN) {
                throw new Error('MCP WebSocket not connected');
            }
        } else if (conn.transport === 'sse') {
            if (!conn.ssePostUrl) {
                throw new Error('MCP SSE not connected');
            }
        } else {
            throw new Error('MCP transport not connected');
        }

        const id = this.nextId++;
        const msg = {
            jsonrpc: '2.0',
            id,
            method,
            params: params || {},
        };

        const requestPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                conn.pending.delete(id);
                reject(new Error(`MCP request timeout: ${method}`));
            }, 30000);

            conn.pending.set(id, { resolve, reject, timeout });
        });

        if (conn.transport === 'ws') {
            conn.ws.send(JSON.stringify(msg));
        } else {
            fetch(conn.ssePostUrl, {
                method: 'POST',
                headers: mergeHeaders({ 'Content-Type': 'application/json' }, conn.headers),
                body: JSON.stringify(msg),
            }).catch((error) => {
                const entry = conn.pending.get(id);
                if (entry) {
                    clearTimeout(entry.timeout);
                    conn.pending.delete(id);
                    entry.reject(new Error(`MCP POST failed: ${error?.message || String(error)}`));
                }
            });
        }
        return requestPromise;
    }

    async ensureConnectedForServer(serverId, transport, url, headers = {}) {
        const conn = this._getOrCreateConnection(serverId);
        const transportLower = inferTransport(transport, url);
        const normalizedHeaders = normalizeHeaders(headers);
        const headerKey = stableHeadersKey(normalizedHeaders);

        if (transportLower === 'ws' || transportLower === 'websocket') {
            return ensureWebSocketConnected({
                conn,
                serverId,
                url,
                normalizedHeaders,
                ...this._connectionCallbacks(),
            });
        }

        if (transportLower === 'sse') {
            return ensureSseConnected({
                conn,
                serverId,
                url,
                normalizedHeaders,
                headerKey,
                ...this._connectionCallbacks(),
            });
        }

        if (transportLower === 'streamable-http' || transportLower === 'streamablehttp') {
            return ensureStreamableHttpConnected({
                conn,
                serverId,
                url,
                normalizedHeaders,
                headerKey,
                ...this._connectionCallbacks(),
            });
        }

        throw new Error(`Unsupported MCP transport: ${transport}`);
    }

    _disconnectState(conn) {
        disconnectMcpConnectionState(conn);
    }

    _resolvePendingRpcMessage(conn, msg) {
        if (!msg || typeof msg !== 'object' || msg.id === undefined) return;

        const entry = conn.pending.get(msg.id);
        if (!entry) return;

        clearTimeout(entry.timeout);
        conn.pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(msg.error.message || 'MCP error'));
        else entry.resolve(msg.result);
    }

    _handleIncomingRpcMessage(conn, message) {
        handleIncomingRpcMessage(conn, message, (state, rpcMessage) =>
            this._resolvePendingRpcMessage(state, rpcMessage)
        );
    }

    _connectionCallbacks() {
        return {
            disconnectState: (conn) => this._disconnectState(conn),
            initializeHandshake: (conn) => this._initializeHandshake(conn),
            bumpIdleClose: (conn, serverId) => this._bumpIdleClose(conn, serverId),
            clearPending: (conn, error) => this._clearPending(conn, error),
            onRpcMessage: (conn, message) => this._handleIncomingRpcMessage(conn, message),
        };
    }

    _bumpIdleClose(conn, serverId) {
        bumpMcpIdleClose(conn, () => this.disconnect(serverId).catch(() => {}));
    }

    _clearPending(conn, error) {
        rejectPendingMcpRequests(conn, error);
    }

    _getOrCreateConnection(serverId) {
        if (!this.connections.has(serverId)) {
            this.connections.set(serverId, createMcpConnectionState());
        }
        return this.connections.get(serverId);
    }

    async _initializeHandshake(conn) {
        return initializeMcpHandshake(conn, {
            clientName: this.clientName,
            clientVersion: this.clientVersion,
            sendRpc: (method, params) => this.sendRpc(conn, method, params),
        });
    }
}
