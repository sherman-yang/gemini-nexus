<div align="center">
  <h1>Gemini Nexus</h1>
  <p>A powerful AI assistant Chrome Extension for Gemini and compatible API providers.</p>
</div>

## Overview

Gemini Nexus integrates Gemini and compatible API providers directly into your browsing experience. It features a side panel for chat, a floating toolbar for quick actions, image analysis tools, browser control tools, and optional external MCP tools.

## Architecture

This directory is the runnable extension project. The repository root contains project-level docs, CI files, license information, and presentation assets.

*   **Side Panel**: The main chat interface (`sidepanel/`).
*   **Sandbox**: Secure iframe environment for rendering Markdown and handling logic (`sandbox/`).
*   **Content Scripts**: Floating toolbar and page interaction (`content/`).
*   **Background**: Service worker handling API calls and session management (`background/`).
*   **Providers**: Gemini Web, Gemini API, and OpenAI-compatible API implementations (`services/providers/`).
*   **Browser Control**: Local Chrome DevTools Protocol tools (`background/control/`).
*   **Vendor References**: Upstream reference snippets kept outside runtime code (`vendor/`).

## External MCP Tools (Remote Servers)

Gemini Nexus can optionally connect to one or more external MCP servers via **SSE**, **Streamable HTTP**, or **WebSocket**, then execute their tools inside the existing tool loop.

Common local proxy endpoints:

*   SSE: `http://127.0.0.1:3006/sse`
*   Streamable HTTP: `http://127.0.0.1:3006/mcp`
*   WebSocket: `ws://127.0.0.1:3006/mcp`

1. Start an MCP server or a proxy such as MCP SuperAssistant.
2. In **Settings → Connection → External MCP Tools**, enable MCP tools.
3. Add or select a server entry, choose the transport, and set the Server URL.
4. Use **Test Connection** and **Refresh Tools** to verify the server and preview tools.
5. Optionally switch **Expose Tools** to **Selected tools only** and choose the tools to expose.
6. Ask normally; if the model needs a tool it will output a JSON tool block like:

```json
{ "tool": "tool_name", "args": { "key": "value" } }
```

In multi-server mode, enabled servers are all available to the conversation. The **Active Server** control only selects the server currently being edited in settings. Tool names may be routed with a unique `serverId__toolName` form.

## Run Locally

**Prerequisites:** Node.js

From this directory:

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run tests:
    ```bash
    npm test
    ```

3.  Package the extension:
    ```bash
    npm run package:extension
    ```

4.  Load into Chrome:
    *   Open `chrome://extensions/`
    *   Enable "Developer mode"
    *   Click "Load unpacked"
    *   Select `artifacts/chrome-extension`

For source-level debugging, you can load this `gemini-nexus/` directory directly. Do not load `dist/` as the extension directory; `dist/` only contains Vite-built UI assets and does not include the complete extension manifest, background scripts, content scripts, services, or libraries.
