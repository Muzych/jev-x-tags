import { describe, expect, it } from 'vitest';
import { DEFAULT_BLOCK_TAGS } from './defaults';
import { normalizeSettings, sanitizeSettings } from './settings';

describe('normalizeSettings', () => {
  it('migrates hideTags to blockTags', () => {
    const settings = normalizeSettings({
      apiKey: 'sk-test',
      hideTags: ['spam'],
    });
    expect(settings.blockTags).toEqual(['spam']);
    expect(settings.apiKey).toBe('sk-test');
  });

  it('prefers blockTags over leftover hideTags', () => {
    const settings = normalizeSettings({
      blockTags: ['promo'],
      hideTags: ['spam'],
    });
    expect(settings.blockTags).toEqual(['promo']);
  });

  it('falls back to default block tags', () => {
    expect(normalizeSettings(null).blockTags).toEqual([...DEFAULT_BLOCK_TAGS]);
  });
});

describe('sanitizeSettings', () => {
  it('trims ids and drops empty tags', () => {
    const next = sanitizeSettings({
      apiKey: '  sk  ',
      tags: [
        { id: ' spam ', description: 'x' },
        { id: '', description: 'gone' },
      ],
      blockTags: [' spam ', ''],
      cacheTtlHours: 0,
    });
    expect(next.apiKey).toBe('sk');
    expect(next.tags).toEqual([{ id: 'spam', description: 'x' }]);
    expect(next.blockTags).toEqual(['spam']);
    expect(next.cacheTtlHours).toBe(168);
  });
});
