# Structure Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.
>
> **Status:** Completed and backfilled on 2026-04-15 from the landed branch history plus fresh verification.
> Where later cleanup simplified file layout further, the checklist reflects the completed result rather than the exact intermediate path names from the draft plan.

**Goal:** Remove the three confirmed low-risk structure issues without changing extension behavior: misleading content entrypoint naming, an unused vendored snapshot formatter copy, and duplicated HTML image parsing logic.

**Architecture:** Keep the current `background` / `content` / `sandbox` / `sidepanel` runtime split intact. Normalize the content script around one logical source entrypoint name, delete the unused vendored formatter copy while keeping an upstream reference, and extract pure HTML-image parsing helpers so paste and drop flows share the same logic.

**Tech Stack:** Vanilla JS modules, Chrome extension APIs, Vite, esbuild, Vitest, jsdom.

---

**Out of Scope:** Flattening the outer repo plus inner `gemini-nexus/` app layout and consolidating the two README files. Those are valid follow-up cleanups, but they affect contributor workflow and release instructions more broadly than this low-risk pass.

### Task 1: Unify the Content Script Entrypoint Contract

**Files:**
- Create: `gemini-nexus/content/bootstrap.js`
- Delete: `gemini-nexus/content/index.js`
- Modify: `gemini-nexus/content/main.js`
- Modify: `gemini-nexus/manifest.json`
- Modify: `gemini-nexus/scripts/package-extension.mjs`
- Test: `gemini-nexus/tests/content/entrypoint_contract.test.js`

- [x] **Step 1: Write the failing test**

```js
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('content entrypoint contract', () => {
  test('uses content/main.js as the single logical entrypoint name', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')
    );
    const packageScript = readFileSync(
      new URL('../../scripts/package-extension.mjs', import.meta.url),
      'utf8'
    );
    const mainSource = readFileSync(
      new URL('../../content/main.js', import.meta.url),
      'utf8'
    );

    expect(manifest.content_scripts[0].js).toEqual(['content/main.js']);
    expect(packageScript).toContain("outfile: path.resolve(dist, 'content/main.js')");
    expect(mainSource).toContain("import './bootstrap.js';");
    expect(mainSource).not.toContain("import './index.js';");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/content/entrypoint_contract.test.js`
Expected: FAIL because `manifest.json` still targets `content/index.js`, the packaging script still emits `dist/content/index.js`, and `content/main.js` still imports `./index.js`.

- [x] **Step 3: Write minimal implementation**

Create `gemini-nexus/content/bootstrap.js` by moving the current `content/index.js` bootstrap body unchanged:

```js
console.log("%c Gemini Nexus v4.2.3 Ready ", "background: #333; color: #00ff00; font-size: 16px");

(function() {
    const shortcuts = window.GeminiShortcuts;
    const router = window.GeminiMessageRouter;
    const Overlay = window.GeminiNexusOverlay;
    const Controller = window.GeminiToolbarController;

    const selectionOverlay = new Overlay();
    const floatingToolbar = new Controller();

    router.init(floatingToolbar, selectionOverlay);
    shortcuts.setController(floatingToolbar);

    chrome.storage.local.get(['geminiTextSelectionEnabled', 'geminiImageToolsEnabled'], (result) => {
        const selectionEnabled = result.geminiTextSelectionEnabled !== false;
        if (floatingToolbar) {
            floatingToolbar.setSelectionEnabled(selectionEnabled);
        }

        const imageToolsEnabled = result.geminiImageToolsEnabled !== false;
        if (floatingToolbar) {
            floatingToolbar.setImageToolsEnabled(imageToolsEnabled);
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.geminiTextSelectionEnabled) {
                 const enabled = changes.geminiTextSelectionEnabled.newValue !== false;
                 if (floatingToolbar) floatingToolbar.setSelectionEnabled(enabled);
            }
            if (changes.geminiImageToolsEnabled) {
                 const enabled = changes.geminiImageToolsEnabled.newValue !== false;
                 if (floatingToolbar) floatingToolbar.setImageToolsEnabled(enabled);
            }
        }
    });
})();
```

Update `gemini-nexus/content/main.js` so the final import becomes:

```js
import './bootstrap.js';
```

Update `gemini-nexus/manifest.json`:

```json
"content_scripts": [
  {
    "matches": ["http://*/*", "https://*/*"],
    "exclude_matches": [
      "https://chrome.google.com/webstore/*",
      "https://chromewebstore.google.com/*",
      "https://accounts.google.com/*"
    ],
    "js": ["content/main.js"],
    "run_at": "document_end"
  }
]
```

Update `gemini-nexus/scripts/package-extension.mjs`:

```js
  await build({
    entryPoints: [path.resolve(root, 'content/main.js')],
    outfile: path.resolve(dist, 'content/main.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome120'],
    logLevel: 'silent',
  });
```

Delete `gemini-nexus/content/index.js` after confirming all references now point at `content/main.js` or `content/bootstrap.js`.

- [x] **Step 4: Run verification**

Run: `npx vitest run tests/content/entrypoint_contract.test.js`
Expected: PASS.

Run: `npm run build`
Expected: PASS and packaged output contains `dist/content/main.js` referenced by the copied manifest.

- [x] **Step 5: Commit**

```bash
git add gemini-nexus/content/bootstrap.js gemini-nexus/content/main.js gemini-nexus/manifest.json gemini-nexus/scripts/package-extension.mjs gemini-nexus/tests/content/entrypoint_contract.test.js
git add -u gemini-nexus/content/index.js
git commit -m "refactor: align content script entrypoints"
```

### Task 2: Remove the Unused Vendored Snapshot Formatter Copy

**Files:**
- Delete: `gemini-nexus/chrome-devtools-mcp-main/src/McpContext.d.ts`
- Delete: `gemini-nexus/chrome-devtools-mcp-main/src/formatters/snapshotFormatter.ts`
- Modify: `gemini-nexus/background/control/snapshot/formatter.js`
- Test: `gemini-nexus/tests/background/snapshot_formatter_reference.test.js`

- [x] **Step 1: Write the failing test**

```js
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, '../..');

describe('snapshot formatter reference hygiene', () => {
  test('keeps only the runtime formatter and an upstream reference', () => {
    const source = readFileSync(
      path.join(rootDir, 'background/control/snapshot/formatter.js'),
      'utf8'
    );

    expect(
      existsSync(path.join(rootDir, 'chrome-devtools-mcp-main/src/McpContext.d.ts'))
    ).toBe(false);
    expect(
      existsSync(
        path.join(
          rootDir,
          'chrome-devtools-mcp-main/src/formatters/snapshotFormatter.ts'
        )
      )
    ).toBe(false);
    expect(source).not.toContain('chrome-devtools-mcp src/formatters/snapshotFormatter.ts');
    expect(source).toContain('https://github.com/ChromeDevTools/chrome-devtools-mcp');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/background/snapshot_formatter_reference.test.js`
Expected: FAIL because the old vendored files still exist and the runtime formatter still references the local mirrored path in a comment.

- [x] **Step 3: Write minimal implementation**

Replace the local mirror note in `gemini-nexus/background/control/snapshot/formatter.js` with an upstream reference:

```js
        // Reference: https://github.com/ChromeDevTools/chrome-devtools-mcp
        // The local formatter intentionally diverges here to prune noisy nodes and keep prompts token-efficient.
        this.booleanPropertyMap = {
```

Delete the stale vendored files:

```text
gemini-nexus/chrome-devtools-mcp-main/src/McpContext.d.ts
gemini-nexus/chrome-devtools-mcp-main/src/formatters/snapshotFormatter.ts
```

Do not move the vendored copy elsewhere in this pass. The goal is one runtime implementation plus one external source of truth, not a local mirror under a new folder.

- [x] **Step 4: Run verification**

Run: `npx vitest run tests/background/snapshot_formatter_reference.test.js`
Expected: PASS.

Run: `npm test`
Expected: PASS with the rest of the suite still green.

- [x] **Step 5: Commit**

```bash
git add gemini-nexus/background/control/snapshot/formatter.js gemini-nexus/tests/background/snapshot_formatter_reference.test.js
git add -u gemini-nexus/chrome-devtools-mcp-main/src/McpContext.d.ts gemini-nexus/chrome-devtools-mcp-main/src/formatters/snapshotFormatter.ts
git commit -m "chore: remove vendored snapshot formatter copy"
```

### Task 3: Share One HTML Image Parsing Helper for Paste and Drop

**Files:**
- Modify: `gemini-nexus/sandbox/core/image_manager.js`
- Test: `gemini-nexus/tests/sandbox/image_manager.test.js`

- [x] **Step 1: Write the failing test**

```js
import { describe, expect, test } from 'vitest';
import { extractHtmlImagePayloads } from '../../sandbox/core/image_manager.js';

describe('extractHtmlImagePayloads', () => {
  test('normalizes base64 and remote images from pasted html', () => {
    const items = extractHtmlImagePayloads(
      '<img src="data:image/png;base64,abc"><img src="https://example.com/a.png">'
    );

    expect(items).toEqual([
      {
        kind: 'file',
        base64: 'data:image/png;base64,abc',
        type: 'image/png',
        name: 'pasted_image.png',
      },
      {
        kind: 'url',
        url: 'https://example.com/a.png',
      },
    ]);
  });

  test('skips likely spacer images for drag-and-drop parsing', () => {
    const items = extractHtmlImagePayloads(
      '<img src="https://example.com/tiny.png" width="12" height="12"><img src="https://example.com/real.png" width="120" height="80">',
      { fileName: 'dragged_image.png', minWidth: 50, minHeight: 50 }
    );

    expect(items).toEqual([
      {
        kind: 'url',
        url: 'https://example.com/real.png',
      },
    ]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sandbox/image_manager.test.js`
Expected: FAIL because `extractHtmlImagePayloads` does not exist.

- [x] **Step 3: Write minimal implementation**

Add a pure helper near the top of `gemini-nexus/sandbox/core/image_manager.js`:

```js
export function extractHtmlImagePayloads(html, options = {}) {
    const { fileName = 'pasted_image.png', minWidth = 0, minHeight = 0 } = options;
    if (!html) return [];

    const doc = new DOMParser().parseFromString(html, 'text/html');

    return Array.from(doc.querySelectorAll('img')).flatMap((img) => {
        const src = img.getAttribute('src') || '';
        if (!src) return [];

        const width = Number(img.getAttribute('width') || img.width || 0);
        const height = Number(img.getAttribute('height') || img.height || 0);
        if (minWidth && minHeight && width > 0 && width < minWidth && height > 0 && height < minHeight) {
            return [];
        }

        if (src.startsWith('data:')) {
            const match = src.match(/^data:(.+);base64,(.+)$/);
            return match
                ? [{ kind: 'file', base64: src, type: match[1], name: fileName }]
                : [];
        }

        if (src.startsWith('http')) {
            return [{ kind: 'url', url: src }];
        }

        return [];
    });
}
```

Refactor both HTML branches to consume the helper instead of reimplementing parsing:

```js
for (const item of extractHtmlImagePayloads(html, { fileName: 'pasted_image.png' })) {
    if (item.kind === 'file') {
        this.addFile(item.base64, item.type, item.name);
        handledHtmlImages = true;
        continue;
    }

    if (item.kind === 'url' && this.onUrlDrop) {
        this.onUrlDrop(item.url);
        handledHtmlImages = true;
    }
}
```

```js
for (const item of extractHtmlImagePayloads(html, {
    fileName: 'dragged_image.png',
    minWidth: 50,
    minHeight: 50
})) {
    if (item.kind === 'file') {
        this.addFile(item.base64, item.type, item.name);
        handledHtmlImages = true;
        continue;
    }

    if (item.kind === 'url' && this.onUrlDrop) {
        this.onUrlDrop(item.url);
        handledHtmlImages = true;
    }
}
```

- [x] **Step 4: Run verification**

Run: `npx vitest run tests/sandbox/image_manager.test.js`
Expected: PASS.

Run: `npm test`
Expected: PASS with no regressions in existing sandbox tests.

- [x] **Step 5: Commit**

```bash
git add gemini-nexus/sandbox/core/image_manager.js gemini-nexus/tests/sandbox/image_manager.test.js
git commit -m "refactor: share sandbox html image parsing"
```

### Task 4: Full Verification Pass

**Files:**
- Modify: none
- Test: existing suite and build outputs

- [x] **Step 1: Run the targeted tests from Tasks 1-3 together**

Run: `npx vitest run tests/content/entrypoint_contract.test.js tests/background/snapshot_formatter_reference.test.js tests/sandbox/image_manager.test.js`
Expected: PASS.

- [x] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [x] **Step 3: Run static verification**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 4: Run production build verification**

Run: `npm run build`
Expected: PASS and packaged extension assets land in `gemini-nexus/dist/`.

- [x] **Step 5: Commit verification note if needed**

```bash
git status --short
```

Expected: no unexpected file churn beyond the planned cleanup changes.
