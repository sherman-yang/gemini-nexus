import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const readCss = (file) => {
    const relativePath = file.startsWith('./') ? file : `./${file}`;
    return readFile(new URL(relativePath, import.meta.url), 'utf8');
};

describe('settings layout styles', () => {
    it('keeps modal scrolling vertical and contained', async () => {
        const settingsCss = await readCss('./settings.css');

        expect(settingsCss).toMatch(
            /\.settings-modal\s+\[hidden\]\s*{[^}]*display:\s*none\s*!important/s
        );
        expect(settingsCss).toMatch(
            /\.settings-content\s+\[hidden\]\s*{[^}]*display:\s*none\s*!important/s
        );
        expect(settingsCss).toMatch(/\.settings-content\s*{[^}]*overflow:\s*hidden/s);
        expect(settingsCss).toMatch(/\.settings-content\s*{[^}]*min-height:\s*0/s);
        expect(settingsCss).toMatch(/\.settings-body\s*{[^}]*min-height:\s*0/s);
        expect(settingsCss).toMatch(/\.settings-body\s*{[^}]*overflow-x:\s*hidden/s);
        expect(settingsCss).toMatch(/\.settings-body\s*{[^}]*padding:\s*16px 20px 24px/s);
    });

    it('lets settings form controls override compact shortcut widths', async () => {
        const formsCss = await readCss('./settings_forms.css');

        expect(formsCss).toMatch(/\.settings-input\.settings-full-input\s*{[^}]*width:\s*100%/s);
        expect(formsCss).toMatch(/\.settings-input\.settings-select\s*{[^}]*width:\s*100%/s);
    });

    it('keeps wide-page tools visible and keeps the full-page launcher available in side panels', async () => {
        const inputCss = await readCss('./input.css');
        const headerCss = await readCss('./header.css');

        expect(inputCss).not.toMatch(
            /body\.layout-wide\s+\.tool-btn\.context-aware\s*{[^}]*display:\s*none/s
        );
        expect(headerCss).toMatch(/body\.host-tab\s+#open-full-page-btn\s*{[^}]*display:\s*none/s);
        expect(headerCss).not.toMatch(
            /@media\s*\(max-width:\s*600px\)[\s\S]*#open-full-page-btn\s*{[^}]*display:\s*none/s
        );
        expect(headerCss).not.toContain('.corner-btn');
    });
});
