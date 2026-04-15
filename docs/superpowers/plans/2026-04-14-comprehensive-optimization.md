# Comprehensive Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.
>
> **Status:** Completed and backfilled on 2026-04-15 from the landed branch history plus fresh verification.
> The checklist reflects the final shipped outcomes now present in the tree and `dist/`.

**Goal:** Complete the remaining structural cleanup, consolidate the extension build around one bundler, and add regression tests for the most fragile web-provider auth flow.

**Architecture:** Keep the current MV3 runtime split, but make `content/main.js` the single content-script entrypoint, shift background/content bundling into Vite so `dist/` comes from one runtime build pipeline, and add focused service-level tests around HTML token parsing and web streaming behavior.

**Tech Stack:** Vanilla JS modules, Chrome MV3, Vite, Vitest, jsdom, Node packaging script.

---

### Task 1: Finish The Content Entrypoint Cleanup

**Files:**
- Delete: `gemini-nexus/content/index.js`
- Modify: `gemini-nexus/content/main.js`
- Modify: `gemini-nexus/manifest.json`
- Test: `gemini-nexus/tests/content/entrypoint_contract.test.js`

- [x] Write a failing contract test that asserts the manifest references `content/main.js`, `content/main.js` no longer imports `./index.js`, and `content/index.js` does not exist.
- [x] Run `npx vitest run tests/content/entrypoint_contract.test.js` and confirm it fails for the current split-entrypoint state.
- [x] Update `content/main.js` to boot the app directly through `bootstrap.js`, update `manifest.json` to point at `content/main.js`, and remove `content/index.js`.
- [x] Re-run `npx vitest run tests/content/entrypoint_contract.test.js`.

### Task 2: Consolidate The Build Pipeline Around Vite

**Files:**
- Modify: `gemini-nexus/vite.config.ts`
- Modify: `gemini-nexus/scripts/package-extension.mjs`
- Modify: `gemini-nexus/package.json`
- Modify: `gemini-nexus/package-lock.json`
- Test: `gemini-nexus/tests/build/package_extension.test.js`

- [x] Write a failing build-packaging test that asserts Vite owns the background/content entry outputs and the packaging script validates copied assets instead of bundling scripts itself.
- [x] Run `npx vitest run tests/build/package_extension.test.js` and confirm it fails against the current esbuild-based script.
- [x] Update Vite inputs to include `background/index.js` and `content/main.js` with stable output paths, then simplify `scripts/package-extension.mjs` to copy static assets and verify required files in `dist/`.
- [x] Remove the direct `esbuild` dependency if nothing else uses it and refresh `package-lock.json`.
- [x] Re-run `npx vitest run tests/build/package_extension.test.js` and `npm run build`.

### Task 3: Add Auth And Web Provider Regression Tests

**Files:**
- Modify: `gemini-nexus/services/auth.js`
- Modify: `gemini-nexus/services/providers/web.js`
- Test: `gemini-nexus/tests/services/auth.test.js`
- Test: `gemini-nexus/tests/services/web_provider.test.js`

- [x] Write failing auth tests for extracting `SNlM0e`, `cfb2h`, and `data-index` values from Gemini HTML, plus the “not logged in” error path.
- [x] Write failing web-provider tests for streamed success parsing, login HTML detection, and network-error surfacing without changing request-dispatcher retry semantics.
- [x] Run `npx vitest run tests/services/auth.test.js tests/services/web_provider.test.js` and confirm the new tests fail first.
- [x] Extract only the helper seams needed to test auth parsing and web stream handling while preserving the existing public behavior of `fetchRequestParams` and `sendWebMessage`.
- [x] Re-run `npx vitest run tests/services/auth.test.js tests/services/web_provider.test.js`.

### Task 4: Full Verification

**Files:**
- Verify only

- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Inspect `gemini-nexus/dist/manifest.json` and confirm it references `background/index.js` and `content/main.js`, both of which exist in `dist/`.
