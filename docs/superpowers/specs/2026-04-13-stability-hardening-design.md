# Stability Hardening Design

**Date:** 2026-04-13

## Goal

Fix four high-confidence regressions in the current `gemini-nexus` worktree without expanding scope into a broader refactor:

1. Floating-toolbar "Chat with Page" must actually include page context.
2. The renderer sandbox bridge must reject untrusted `postMessage` traffic.
3. Sanitization must preserve valid SVG sizing attributes used by the UI.
4. Login-expired guidance must remain safe while still exposing a clickable recovery path.

## Non-Goals

- No redesign of the sidepanel, toolbar, or session architecture.
- No broader migration of all message bridges to a new transport layer.
- No change to provider behavior beyond the login-error presentation fix.
- No unrelated UI polish or settings redesign.

## Current Problems

### 1. Quick Ask Ignores Page Context

The content toolbar sends `includePageContext: true` for "Chat with Page", but the quick-ask code path sends the request straight to `sessionManager.handleSendPrompt()` and skips the prompt-building layer. That means the feature presents itself as page-aware while silently omitting page content.

### 2. Renderer Mode Accepts Untrusted Messages

The web-accessible renderer sandbox listens to `message` events and processes render/image requests without validating the sender window, origin, or bridge token. Other bridge surfaces already use stricter checks, so this renderer path is now the weakest link.

### 3. Sanitizer Removes Valid SVG Viewport Data

The sanitizer lowercases attribute names before allowlist comparison, but the SVG allowlist currently uses `viewBox` instead of `viewbox`. In practice, valid SVGs lose their viewport metadata, which can distort icons or inline vector UI.

### 4. Login Recovery Link Became Plain Text

Provider login-expired errors are generated as HTML anchor tags, but the floating-toolbar error renderer now deliberately uses text-only rendering to prevent HTML injection. That safety improvement unintentionally removed the clickable recovery link needed to resolve the auth problem.

## Recommended Approach

Use a minimal, behavior-focused fix set:

- Preserve the current module boundaries.
- Add regression tests before each production change.
- Reuse existing message-security helpers instead of inventing a parallel validation scheme.
- Keep login-error rendering safe by moving from "raw HTML string" to structured or recognized-safe link rendering, rather than re-enabling arbitrary HTML.

This is the lowest-risk approach because it restores intended behavior without destabilizing the recent hardening work.

## Design

### A. Restore Page Context in Quick Ask

Quick ask needs to regain access to the same prompt-building behavior that normal prompt submission already uses. The change should happen in the background quick-ask handler so the UI contract stays simple: if a request includes `includePageContext`, the background path is responsible for honoring it.

Recommended design:

- Inject `PromptBuilder` into the quick-ask flow, or reuse it locally inside the handler.
- Build `systemInstruction` from the request before calling `sessionManager.handleSendPrompt()`.
- Keep the user-visible prompt text unchanged so history remains readable.
- Add a regression test proving that `includePageContext: true` produces a request containing built system instructions or page context.

This keeps page-context behavior consistent across quick-ask and full sidepanel sends without altering the rest of the request pipeline.

### B. Validate Renderer Messages

The renderer should only process requests from the embedding extension iframe/bridge, never from arbitrary pages. We already have a token-based bridge model for renderer responses, so the renderer request side should mirror that discipline.

Recommended design:

- Import or reuse existing parent-message trust helpers for renderer mode.
- Derive the expected parent origin from `window.location.origin`.
- Reject any incoming message whose `source` is not `window.parent`, whose `origin` does not match the extension origin, or whose `bridgeToken` is missing/invalid for the current session.
- Tighten the manifest exposure if possible without breaking the content-script renderer iframe flow. If the iframe must stay web-accessible for content scripts, message validation remains the primary safety control.
- Add regression tests around accepted and rejected renderer messages.

This aligns renderer behavior with the bridge-security rules already used elsewhere in the extension.

### C. Preserve SVG Viewport Attributes During Sanitization

The sanitizer should continue stripping dangerous content while allowing known-safe structural SVG attributes used by icons and rendered controls.

Recommended design:

- Normalize SVG attribute allowlist entries to the same casing strategy used during sanitization.
- Add a focused test proving `viewBox` survives sanitization.
- Keep the rest of the sanitizer strict; this is a compatibility correction, not a liberalization of the policy.

### D. Restore Safe Clickable Login Recovery

We need a clickable login path without reintroducing arbitrary HTML rendering in the floating toolbar. The safest pattern is to render plain text by default and only synthesize a DOM anchor for a known recovery URL.

Recommended design:

- Stop sending provider-generated HTML strings as the canonical error payload for login expiry.
- Send either:
  - structured error metadata such as `{ text, loginUrl }`, or
  - a plain-text message plus a narrowly recognized URL field.
- Update the floating-toolbar error view to render the link via DOM APIs (`createElement('a')`, `textContent`, `href`) only when a trusted login URL is present.
- Preserve the current text-only behavior for all other errors.
- Add a regression test proving the login error remains clickable while arbitrary HTML is still not interpreted.

This preserves the recent safety improvement while restoring the recovery workflow.

## Files Likely To Change

- `gemini-nexus/background/handlers/session/quick_ask_handler.js`
- `gemini-nexus/background/handlers/session/prompt/builder.js` or nearby shared prompt logic
- `gemini-nexus/background/managers/session_manager.js`
- `gemini-nexus/content/toolbar/view/window.js`
- `gemini-nexus/content/toolbar/bridge.js` if shared bridge token behavior needs adjustment
- `gemini-nexus/lib/message_security.js`
- `gemini-nexus/sandbox/boot/renderer.js`
- `gemini-nexus/sandbox/render/sanitize.js`
- Relevant Vitest files under `gemini-nexus/tests/background/`, `gemini-nexus/tests/content/`, and `gemini-nexus/tests/sandbox/`

## Data Flow Summary

### Quick Ask With Page Context

1. Content toolbar sends `QUICK_ASK` with `includePageContext: true`.
2. Background quick-ask path builds the same context-aware system instruction used by normal prompts.
3. Session manager dispatches the request with the built system instruction.
4. Streaming and saved history remain unchanged from the user's perspective.

### Renderer Bridge

1. Toolbar bridge sends render/image requests to sandbox iframe.
2. Renderer verifies source/origin/token before doing any work.
3. Renderer returns results only to the validated requester.

### Login Recovery

1. Provider/session layer detects login-expired state.
2. Background returns a safe error payload with explicit recovery link data.
3. Toolbar error view renders text safely and adds a clickable anchor only for the trusted recovery URL.

## Error Handling

- If page context cannot be fetched, quick ask should still send the user prompt instead of failing the whole request.
- If renderer validation fails, it should ignore the message silently rather than process or echo it.
- If a login recovery URL is absent, the UI should fall back to plain-text guidance.
- Sanitization changes must fail closed: unsupported attributes stay stripped.

## Testing Strategy

Add targeted regression tests before implementation:

- Quick ask test that currently fails because page context is ignored.
- Renderer security test that proves untrusted messages are rejected.
- Sanitizer test that proves SVG `viewBox` survives.
- Toolbar error-view test that proves login guidance is clickable without interpreting arbitrary HTML.

After targeted tests pass, run:

- `npm test`
- `npm run typecheck`
- `npm run build`

## Risks And Mitigations

- Risk: reusing prompt-building logic in quick ask could unintentionally alter existing quick-ask behavior.
  Mitigation: keep the change limited to optional `includePageContext` behavior and cover the existing session-continuation path with tests.

- Risk: renderer validation could block legitimate iframe traffic if the expected origin or token is computed incorrectly.
  Mitigation: add both positive and negative tests around the exact bridge shape used today.

- Risk: login-error payload changes could affect sidepanel behavior as well as toolbar behavior.
  Mitigation: preserve backward-compatible text fields where possible and only branch on explicit recovery-link metadata in the UI.
