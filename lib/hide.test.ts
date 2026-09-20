import { describe, expect, it } from 'vitest';
import { shouldHideByTag } from './hide';

describe('shouldHideByTag', () => {
  it('hides only when the assigned tag is in the hide set', () => {
    expect(shouldHideByTag('spam', ['spam', 'crypto'])).toBe(true);
    expect(shouldHideByTag('tech', ['spam', 'crypto'])).toBe(false);
  });

  it('is case-insensitive and fail-open on empty tag', () => {
    expect(shouldHideByTag('Crypto', ['crypto'])).toBe(true);
    expect(shouldHideByTag(undefined, ['spam'])).toBe(false);
    expect(shouldHideByTag('', ['spam'])).toBe(false);
  });

  it('does not hide from noul — only from the tag set', () => {
    // noul is a UI suggestion; this helper never sees it
    expect(shouldHideByTag('personal', ['spam'])).toBe(false);
  });
});
