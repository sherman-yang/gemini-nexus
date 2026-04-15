# Stability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.
>
> **Status:** Completed and backfilled on 2026-04-15 from the landed branch history plus fresh verification.
> The checklist below reflects the shipped outcomes; a few implementation details were later refined by follow-up cleanup commits.

**Goal:** Restore the four confirmed regressions in quick-ask page context, renderer bridge validation, SVG sanitization, and login recovery UX without broadening scope.

**Architecture:** Keep the existing extension structure and repair behavior in place. Reuse the current background prompt-building path for quick ask, extend the existing message-security helpers for renderer requests, make the sanitizer casing-aware for SVG viewport attributes, and move login recovery from raw HTML strings to safe structured rendering.

**Tech Stack:** Vanilla JS modules, Chrome extension APIs, Vitest, jsdom, Vite.

---

### Task 1: Restore Quick Ask Page Context

**Files:**
- Modify: `gemini-nexus/background/handlers/session/quick_ask_handler.js`
- Test: `gemini-nexus/tests/background/quick_ask_handler.test.js`

- [x] **Step 1: Write the failing test**

```js
test('builds page-context system instructions for quick ask requests', async () => {
  const sessionManager = {
    resetContext: vi.fn(),
    ensureInitialized: vi.fn(),
    handleSendPrompt: vi.fn().mockResolvedValue({ status: 'success', text: 'done' }),
  };
  const promptBuilder = {
    build: vi.fn().mockResolvedValue({
      systemInstruction: 'Webpage Context:\n```text\nPage body\n```',
      userPrompt: 'question',
    }),
  };

  const handler = new QuickAskHandler(sessionManager, {}, { promptBuilder });

  await handler.handleQuickAsk(
    { text: 'question', includePageContext: true },
    { tab: { id: 9 } }
  );

  expect(promptBuilder.build).toHaveBeenCalledWith(
    expect.objectContaining({ includePageContext: true, text: 'question' })
  );
  expect(sessionManager.handleSendPrompt).toHaveBeenCalledWith(
    expect.objectContaining({
      text: 'question',
      systemInstruction: expect.stringContaining('Webpage Context:'),
    }),
    expect.any(Function)
  );
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/background/quick_ask_handler.test.js`
Expected: FAIL because `QuickAskHandler` does not yet build or forward `systemInstruction`.

- [x] **Step 3: Write minimal implementation**

```js
export class QuickAskHandler {
  constructor(sessionManager, imageHandler, deps = {}) {
    this.sessionManager = sessionManager;
    this.imageHandler = imageHandler;
    this.promptBuilder = deps.promptBuilder || null;
  }

  async handleQuickAsk(request, sender) {
    // ...
    let promptRequest = request;
    if (request.includePageContext && this.promptBuilder) {
      const built = await this.promptBuilder.build(request);
      promptRequest = {
        ...request,
        text: built.userPrompt,
        systemInstruction: built.systemInstruction,
      };
    }
    const result = await this.sessionManager.handleSendPrompt(promptRequest, onUpdate);
    // ...
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/background/quick_ask_handler.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add gemini-nexus/background/handlers/session/quick_ask_handler.js gemini-nexus/tests/background/quick_ask_handler.test.js
git commit -m "fix: restore quick ask page context"
```

### Task 2: Reject Untrusted Renderer Messages

**Files:**
- Modify: `gemini-nexus/lib/message_security.js`
- Modify: `gemini-nexus/sandbox/boot/renderer.js`
- Test: `gemini-nexus/tests/messaging/bridge-security.test.js`

- [x] **Step 1: Write the failing test**

```js
test('validates renderer requests against parent window origin and token', () => {
  const parentWindow = {};
  const trustedEvent = {
    source: parentWindow,
    origin: 'chrome-extension://abc123',
    data: { bridgeToken: 'token-1' },
  };

  expect(isTrustedRendererRequest(trustedEvent, parentWindow, 'chrome-extension://abc123', 'token-1')).toBe(true);
  expect(isTrustedRendererRequest({ ...trustedEvent, origin: 'https://example.com' }, parentWindow, 'chrome-extension://abc123', 'token-1')).toBe(false);
  expect(isTrustedRendererRequest({ ...trustedEvent, data: { bridgeToken: 'wrong' } }, parentWindow, 'chrome-extension://abc123', 'token-1')).toBe(false);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/messaging/bridge-security.test.js`
Expected: FAIL because `isTrustedRendererRequest` does not exist.

- [x] **Step 3: Write minimal implementation**

```js
export function isTrustedRendererRequest(event, expectedWindow, expectedOrigin, expectedToken) {
  return Boolean(
    expectedWindow &&
    event &&
    event.source === expectedWindow &&
    event.origin === expectedOrigin &&
    event.data &&
    event.data.bridgeToken === expectedToken
  );
}
```

```js
export function initRendererMode() {
  const parentOrigin = window.location.origin;
  const activeBridgeToken = new Set();

  window.addEventListener('message', async (e) => {
    const token = e?.data?.bridgeToken;
    if (!token) return;

    if (e.data.action === 'RENDER') {
      if (!isTrustedRendererRequest(e, window.parent, parentOrigin, token)) return;
      activeBridgeToken.add(token);
      // existing render flow
    }

    if (e.data.action === 'PROCESS_IMAGE') {
      if (!isTrustedRendererRequest(e, window.parent, parentOrigin, token)) return;
      // existing image flow
    }
  });
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/messaging/bridge-security.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add gemini-nexus/lib/message_security.js gemini-nexus/sandbox/boot/renderer.js gemini-nexus/tests/messaging/bridge-security.test.js
git commit -m "fix: validate renderer bridge messages"
```

### Task 3: Preserve SVG Viewport Attributes

**Files:**
- Modify: `gemini-nexus/sandbox/render/sanitize.js`
- Test: `gemini-nexus/tests/sandbox/sanitize.test.js`

- [x] **Step 1: Write the failing test**

```js
test('preserves svg viewbox attributes during sanitization', () => {
  const html = sanitizeHtml('<svg viewBox="0 0 24 24"><path d="M0 0"></path></svg>');
  expect(html).toContain('viewBox="0 0 24 24"');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sandbox/sanitize.test.js`
Expected: FAIL because the current sanitizer strips `viewBox`.

- [x] **Step 3: Write minimal implementation**

```js
const TAG_ATTRS = {
  svg: new Set(['fill', 'height', 'stroke', 'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'viewbox', 'width', 'xmlns']),
  // ...
};
```

If needed, preserve original attribute casing by comparing on a normalized lowercase key while leaving the DOM attribute untouched.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sandbox/sanitize.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add gemini-nexus/sandbox/render/sanitize.js gemini-nexus/tests/sandbox/sanitize.test.js
git commit -m "fix: preserve svg viewport attributes"
```

### Task 4: Restore Safe Clickable Login Recovery

**Files:**
- Modify: `gemini-nexus/background/managers/session_manager.js`
- Modify: `gemini-nexus/content/toolbar/view/window.js`
- Test: `gemini-nexus/tests/content/window_view.test.js`

- [x] **Step 1: Write the failing test**

```js
test('renders trusted login recovery links without interpreting arbitrary html', () => {
  const elements = {
    askWindow: document.createElement('div'),
    resultText: document.createElement('div'),
    windowFooter: document.createElement('div'),
    footerStop: document.createElement('div'),
    footerActions: document.createElement('div'),
    buttons: { copy: document.createElement('button') },
  };
  const view = new window.GeminiViewWindow(elements);

  view.showError('Account expired.', {
    linkText: 'Open Gemini login',
    linkUrl: 'https://gemini.google.com/u/0/',
  });

  const link = elements.resultText.querySelector('a');
  expect(link?.href).toBe('https://gemini.google.com/u/0/');
  expect(elements.resultText.querySelector('img')).toBeNull();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/content/window_view.test.js`
Expected: FAIL because `showError` does not yet accept or render link metadata.

- [x] **Step 3: Write minimal implementation**

```js
return {
  action: 'GEMINI_REPLY',
  text: isZh ? '账号未登录或会话已过期。' : 'Account not logged in.',
  status: 'error',
  errorMeta: {
    linkText: isZh ? `打开 Gemini 登录（账号 ${currentIndex}）` : `Open Gemini login (account ${currentIndex})`,
    linkUrl: `https://gemini.google.com/u/${currentIndex}/`,
  },
};
```

```js
showError(text, meta = null) {
  // existing safe text rendering
  if (meta?.linkUrl) {
    const link = document.createElement('a');
    link.href = meta.linkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = meta.linkText || meta.linkUrl;
    container.appendChild(link);
  }
}
```

Update the toolbar streaming/done path to pass `result.errorMeta` into `showError`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/content/window_view.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add gemini-nexus/background/managers/session_manager.js gemini-nexus/content/toolbar/view/window.js gemini-nexus/tests/content/window_view.test.js
git commit -m "fix: restore safe login recovery links"
```

### Task 5: Final Verification

**Files:**
- Verify only

- [x] Run targeted tests:
  `npx vitest run tests/background/quick_ask_handler.test.js tests/messaging/bridge-security.test.js tests/sandbox/sanitize.test.js tests/content/window_view.test.js`
- [x] Run full suite:
  `npm test`
- [x] Run typecheck:
  `npm run typecheck`
- [x] Run production build:
  `npm run build`
- [x] Inspect `dist/` only if build output changes unexpectedly.
