import { describe, expect, it } from 'vitest';

import { TemplateIcons } from './icons.js';

describe('TemplateIcons', () => {
    it('centralizes common viewer and project link icons', () => {
        expect(TemplateIcons.DOWNLOAD).toContain('<svg');
        expect(TemplateIcons.BROWSER_TAB).toContain('<svg');
        expect(TemplateIcons.GITHUB).toContain('<svg');
        expect(TemplateIcons.RELEASES).toContain('<svg');
        expect(TemplateIcons.ZOOM_IN).toContain('<svg');
        expect(TemplateIcons.ZOOM_OUT).toContain('<svg');
        expect(TemplateIcons.CHECK).toContain('<svg');
        expect(TemplateIcons.COPY).toContain('<svg');
        expect(TemplateIcons.EDIT).toContain('<svg');
        expect(TemplateIcons.SEND).toContain('<svg');
        expect(TemplateIcons.STOP).toContain('<svg');
        expect(TemplateIcons.SUMMARY).toContain('<svg');
        expect(TemplateIcons.KEY).toContain('<svg');
        expect(TemplateIcons.KEY).toContain(
            'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z'
        );
        expect(TemplateIcons.KEY).toContain(
            '<circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>'
        );
    });
});
