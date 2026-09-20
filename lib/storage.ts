import { storage } from 'wxt/utils/storage';
import { DEFAULT_SETTINGS, LOG_LIMIT } from './defaults';
import type { CacheEntry, LogEntry, Settings } from './types';

export const settingsItem = storage.defineItem<Settings>('local:jev.settings', {
  fallback: DEFAULT_SETTINGS,
});

export const cacheItem = storage.defineItem<Record<string, CacheEntry>>(
  'local:jev.cache',
  { fallback: {} },
);

export const logItem = storage.defineItem<LogEntry[]>('local:jev.log', {
  fallback: [],
});

export async function readSettings(): Promise<Settings> {
  const value = await settingsItem.getValue();
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    tags: value?.tags?.length ? value.tags : DEFAULT_SETTINGS.tags,
    hideTags: value?.hideTags ?? DEFAULT_SETTINGS.hideTags,
    cacheTtlHours: value?.cacheTtlHours ?? DEFAULT_SETTINGS.cacheTtlHours,
    apiKey: value?.apiKey ?? '',
  };
}

export async function writeSettings(next: Settings): Promise<void> {
  await settingsItem.setValue({
    apiKey: next.apiKey.trim(),
    tags: next.tags
      .map((t) => ({ id: t.id.trim(), description: t.description }))
      .filter((t) => t.id),
    hideTags: next.hideTags.map((t) => t.trim()).filter(Boolean),
    cacheTtlHours: Math.max(1, Math.min(24 * 30, Number(next.cacheTtlHours) || 168)),
  });
}

export async function appendLog(entry: LogEntry): Promise<void> {
  const current = (await logItem.getValue()) ?? [];
  const next = [entry, ...current].slice(0, LOG_LIMIT);
  await logItem.setValue(next);
}

export async function clearCacheAndLog(): Promise<void> {
  await cacheItem.setValue({});
  await logItem.setValue([]);
}
