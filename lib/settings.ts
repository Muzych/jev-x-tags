import { DEFAULT_SETTINGS } from './defaults';
import type { Settings, StoredSettings } from './types';

/** Merge stored settings; migrate hideTags → blockTags. Missing auto-block stays off. */
export function normalizeSettings(value?: StoredSettings | null): Settings {
  const blockTags =
    value?.blockTags ?? value?.hideTags ?? DEFAULT_SETTINGS.blockTags;
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    tags: value?.tags?.length ? value.tags : DEFAULT_SETTINGS.tags,
    blockTags: blockTags.map((t) => t.trim()).filter(Boolean),
    autoBlockEnabled: value?.autoBlockEnabled ?? DEFAULT_SETTINGS.autoBlockEnabled,
    cacheTtlHours: value?.cacheTtlHours ?? DEFAULT_SETTINGS.cacheTtlHours,
    apiKey: value?.apiKey ?? '',
  };
}

export function sanitizeSettings(next: Settings): Settings {
  return {
    apiKey: next.apiKey.trim(),
    tags: next.tags
      .map((t) => ({ id: t.id.trim(), description: t.description }))
      .filter((t) => t.id),
    blockTags: next.blockTags.map((t) => t.trim()).filter(Boolean),
    autoBlockEnabled: Boolean(next.autoBlockEnabled),
    cacheTtlHours: Math.max(
      1,
      Math.min(24 * 30, Number(next.cacheTtlHours) || 168),
    ),
  };
}
