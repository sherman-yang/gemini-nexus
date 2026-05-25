import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';

async function installSpeechReader() {
    await import('./speech_reader.js');
}

describe('GeminiSpeechReader', () => {
    beforeEach(async () => {
        vi.resetModules();
        const dom = new JSDOM(
            '<!doctype html><html><body><main>Hello world. 你好世界。</main><script>ignored</script></body></html>'
        );
        globalThis.window = dom.window;
        globalThis.document = dom.window.document;
        Object.defineProperty(globalThis, 'navigator', {
            value: dom.window.navigator,
            configurable: true,
        });
        globalThis.SpeechSynthesisUtterance = class {
            constructor(text) {
                this.text = text;
            }
        };
        await installSpeechReader();
    });

    it('splits long text into readable chunks', () => {
        const chunks = window.GeminiSpeechReaderUtils.splitText(
            `${'a'.repeat(190)}. Short sentence.`
        );

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((chunk) => chunk.length <= 180)).toBe(true);
    });

    it('reads page text while ignoring script content', () => {
        const text = window.GeminiSpeechReaderUtils.getPageText();

        expect(text).toContain('Hello world');
        expect(text).not.toContain('ignored');
    });

    it('starts reading text and toggles to stop while speaking', () => {
        const speechSynthesis = {
            speaking: false,
            cancel: vi.fn(),
            speak: vi.fn(),
        };
        const reader = new window.GeminiSpeechReader({ speechSynthesis });

        expect(reader.readSelection('Hello world')).toEqual({
            status: 'started',
            title: 'Read selection',
            chunks: 1,
        });
        expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);

        speechSynthesis.speaking = true;
        expect(reader.readSelection('Hello again')).toEqual({
            status: 'stopped',
            title: 'Read selection',
        });
        expect(speechSynthesis.cancel).toHaveBeenCalledTimes(2);
    });
});
