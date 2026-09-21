import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
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

  it('ships empty tags and blockTags', () => {
    const settings = normalizeSettings(null);
    expect(settings.tags).toEqual([]);
    expect(settings.blockTags).toEqual([]);
    expect(DEFAULT_SETTINGS.tags).toEqual([]);
    expect(DEFAULT_SETTINGS.blockTags).toEqual([]);
  });

  it('keeps previously stored tag lists (does not wipe old installs)', () => {
    const settings = normalizeSettings({
      tags: [{ id: 'spam', description: 'old' }],
      blockTags: ['spam'],
    });
    expect(settings.tags).toEqual([{ id: 'spam', description: 'old' }]);
    expect(settings.blockTags).toEqual(['spam']);
  });

  it('keeps an explicitly empty tag list empty', () => {
    expect(normalizeSettings({ tags: [], blockTags: [] }).tags).toEqual([]);
    expect(normalizeSettings({ tags: [], blockTags: [] }).blockTags).toEqual([]);
  });

  it('defaults autoBlockEnabled to false', () => {
    expect(normalizeSettings(null).autoBlockEnabled).toBe(false);
    expect(normalizeSettings({ apiKey: 'sk' }).autoBlockEnabled).toBe(false);
  });

  it('preserves an explicit autoBlockEnabled true', () => {
    expect(normalizeSettings({ autoBlockEnabled: true }).autoBlockEnabled).toBe(
      true,
    );
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
      autoBlockEnabled: true,
      cacheTtlHours: 0,
    });
    expect(next.apiKey).toBe('sk');
    expect(next.tags).toEqual([{ id: 'spam', description: 'x' }]);
    expect(next.blockTags).toEqual(['spam']);
    expect(next.autoBlockEnabled).toBe(true);
    expect(next.cacheTtlHours).toBe(168);
  });

  it('coerces autoBlockEnabled to a boolean and defaults off', () => {
    expect(
      sanitizeSettings({
        apiKey: 'sk',
        tags: [{ id: 'spam', description: 'x' }],
        blockTags: ['spam'],
        autoBlockEnabled: false,
        cacheTtlHours: 24,
      }).autoBlockEnabled,
    ).toBe(false);
  });
});
