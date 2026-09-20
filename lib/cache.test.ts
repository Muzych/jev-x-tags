import { describe, expect, it } from 'vitest';
import { isFresh, pruneCache, ttlMs } from './cache';

describe('cache TTL', () => {
  const now = 1_700_000_000_000;

  it('treats missing entries as stale', () => {
    expect(isFresh(undefined, 24, now)).toBe(false);
  });

  it('keeps entries inside the window', () => {
    expect(
      isFresh({ tag: 'tech', shouldHideCandidate: 0.1, taggedAt: now - 1000 }, 1, now),
    ).toBe(true);
  });

  it('expires entries past TTL', () => {
    expect(
      isFresh(
        { tag: 'spam', shouldHideCandidate: 0.9, taggedAt: now - ttlMs(2) },
        1,
        now,
      ),
    ).toBe(false);
  });

  it('prunes stale handles', () => {
    const pruned = pruneCache(
      {
        alice: { tag: 'tech', shouldHideCandidate: 0, taggedAt: now - 10 },
        bob: { tag: 'spam', shouldHideCandidate: 1, taggedAt: now - ttlMs(48) },
      },
      24,
      now,
    );
    expect(Object.keys(pruned)).toEqual(['alice']);
  });
});
