import { describe, expect, it } from 'vitest';
import { shouldBlockByTag } from './match';

describe('shouldBlockByTag', () => {
  it('matches only when the assigned tag is in the block set', () => {
    expect(shouldBlockByTag('spam', ['spam', 'crypto'])).toBe(true);
    expect(shouldBlockByTag('tech', ['spam', 'crypto'])).toBe(false);
  });

  it('is case-insensitive and fail-open on empty tag', () => {
    expect(shouldBlockByTag('Crypto', ['crypto'])).toBe(true);
    expect(shouldBlockByTag(undefined, ['spam'])).toBe(false);
    expect(shouldBlockByTag('', ['spam'])).toBe(false);
  });

  it('does not block from noul — only from the tag set', () => {
    expect(shouldBlockByTag('personal', ['spam'])).toBe(false);
  });
});
