import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const readCss = (file) => readFile(new URL(`./${file}`, import.meta.url), 'utf8');

describe('input layout styles', () => {
    it('keeps the wide composer inset from the sidebar edge like AMC', async () => {
        const inputCss = await readCss('input.css');

        expect(inputCss).toMatch(/\.footer\s*{[^}]*box-sizing:\s*border-box/s);
        expect(inputCss).toMatch(
            /body\.layout-wide\s+\.footer\s*{[^}]*padding-left:\s*calc\(16\.2rem \+ 12px\)/s
        );
        expect(inputCss).toMatch(
            /body\.layout-wide\.sidebar-collapsed\s+\.footer\s*{[^}]*padding-left:\s*calc\(52\.2px \+ 8px\)/s
        );
        expect(inputCss).not.toContain('body.layout-wide .footer {\n    padding-left: 16.2rem;');
    });

    it('keeps the composer close to AMC with a single dense rounded shell', async () => {
        const inputCss = await readCss('input.css');
        const attachmentsCss = await readCss('input_attachments.css');

        expect(inputCss).toMatch(/\.input-wrapper\s*{[^}]*max-width:\s*40\.32rem/s);
        expect(inputCss).toMatch(
            /\.input-wrapper\s*{[^}]*border:\s*1px solid var\(--border-color\)/s
        );
        expect(inputCss).toMatch(/\.input-wrapper\s*{[^}]*border-radius:\s*26px/s);
        expect(inputCss).toMatch(/\.input-wrapper\s*{[^}]*background:\s*var\(--bg-input\)/s);
        expect(inputCss).toMatch(/\.composer-actions\s*{[^}]*justify-content:\s*space-between/s);
        expect(inputCss).toMatch(/\.composer-textarea-shell\s*{[^}]*cursor:\s*text/s);
        expect(inputCss).toMatch(/#prompt\s*{[^}]*min-height:\s*26px/s);
        expect(inputCss).toMatch(/#upload-btn,\s*#send\s*{[^}]*width:\s*40px/s);
        expect(inputCss).not.toContain('.input-row');

        expect(attachmentsCss).toMatch(/\.image-preview\s*{[^}]*padding:\s*0 4px 8px/s);
        expect(attachmentsCss).toMatch(/\.preview-item\s*{[^}]*width:\s*64px/s);
    });
});
