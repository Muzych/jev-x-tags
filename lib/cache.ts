import type { CacheEntry } from './types';

export function ttlMs(hours: number): number {
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 168;
  return safe * 60 * 60 * 1000;
}

export function isFresh(
  entry: CacheEntry | undefined,
  ttlHours: number,
  now = Date.now(),
): entry is CacheEntry {
  if (!entry) return false;
  return now - entry.taggedAt < ttlMs(ttlHours);
}

export function pruneCache(
  cache: Record<string, CacheEntry>,
  ttlHours: number,
  now = Date.now(),
): Record<string, CacheEntry> {
  const next: Record<string, CacheEntry> = {};
  for (const [handle, entry] of Object.entries(cache)) {
    if (isFresh(entry, ttlHours, now)) next[handle] = entry;
  }
  return next;
}
