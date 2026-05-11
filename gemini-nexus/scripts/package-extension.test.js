import { describe, expect, it } from 'vitest';
import { shouldExcludeFromPackage } from './package-extension.mjs';

describe('package-extension', () => {
  it('excludes test files from packaged source directories', () => {
    expect(shouldExcludeFromPackage('services/parser.test.js')).toBe(true);
    expect(shouldExcludeFromPackage('background/managers/session/context_manager.test.js')).toBe(true);
    expect(shouldExcludeFromPackage('lib/tool_call_text.test.js')).toBe(true);
  });

  it('keeps runtime source files in the package', () => {
    expect(shouldExcludeFromPackage('services/parser.js')).toBe(false);
    expect(shouldExcludeFromPackage('background/index.js')).toBe(false);
    expect(shouldExcludeFromPackage('dist/assets/app.js')).toBe(false);
  });
});
