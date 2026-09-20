import { storage } from 'wxt/utils/storage';
import { LOG_LIMIT } from './defaults';
import { normalizeSettings, sanitizeSettings } from './settings';
import type { BlockRecord, CacheEntry, LogEntry, Settings } from './types';

export const settingsItem = storage.defineItem<Settings>('local:jev.settings', {
  fallback: normalizeSettings(null),
});

export const cacheItem = storage.defineItem<Record<string, CacheEntry>>(
  'local:jev.cache',
  { fallback: {} },
);

export const logItem = storage.defineItem<LogEntry[]>('local:jev.log', {
  fallback: [],
});

export const blocksItem = storage.defineItem<Record<string, BlockRecord>>(
  'local:jev.blocks',
  { fallback: {} },
);

export async function readSettings(): Promise<Settings> {
  return normalizeSettings(await settingsItem.getValue());
}

export async function writeSettings(next: Settings): Promise<void> {
  await settingsItem.setValue(sanitizeSettings(next));
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

export async function readBlocks(): Promise<Record<string, BlockRecord>> {
  return (await blocksItem.getValue()) ?? {};
}

export async function writeBlocks(
  next: Record<string, BlockRecord>,
): Promise<void> {
  await blocksItem.setValue(next);
}
