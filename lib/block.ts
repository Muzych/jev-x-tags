import {
  AUTO_RETRY_FAILED_MS,
  BLOCK_STORE_LIMIT,
  CLAIM_BATCH,
  STALE_BLOCKING_MS,
} from './defaults';
import { shouldBlockByTag } from './match';
import type { BlockCounts, BlockRecord, BlockStatus, CacheEntry } from './types';

export function emptyCounts(): BlockCounts {
  return { pending: 0, blocking: 0, blocked: 0, failed: 0 };
}

export function summarizeBlocks(
  blocks: Record<string, BlockRecord>,
): BlockCounts {
  const counts = emptyCounts();
  for (const record of Object.values(blocks)) {
    if (record.status in counts) counts[record.status] += 1;
  }
  return counts;
}

export function isConfirmedBlock(record: BlockRecord | undefined): boolean {
  return Boolean(record?.confirmed && record.status === 'blocked');
}

/** Skip auto-enqueue so we don't re-spam a handle we already tried. */
export function shouldSkipAutoEnqueue(
  record: BlockRecord | undefined,
  now = Date.now(),
): boolean {
  if (!record) return false;
  if (isConfirmedBlock(record)) return true;
  if (record.status === 'pending' || record.status === 'blocking') return true;
  if (
    record.status === 'failed' &&
    now - record.updatedAt < AUTO_RETRY_FAILED_MS
  ) {
    return true;
  }
  return false;
}

export function listMatchingHandles(
  cache: Record<string, CacheEntry>,
  blockTags: readonly string[],
): string[] {
  return Object.entries(cache)
    .filter(([, entry]) => shouldBlockByTag(entry.tag, blockTags))
    .map(([handle]) => handle);
}

export function enqueueBlock(
  blocks: Record<string, BlockRecord>,
  input: {
    handle: string;
    userId?: string;
    tag?: string;
    force?: boolean;
  },
  now = Date.now(),
): { blocks: Record<string, BlockRecord>; enqueued: boolean } {
  const current = blocks[input.handle];
  if (isConfirmedBlock(current)) {
    return { blocks, enqueued: false };
  }
  if (!input.force && shouldSkipAutoEnqueue(current, now)) {
    return { blocks, enqueued: false };
  }
  if (
    current &&
    (current.status === 'pending' || current.status === 'blocking')
  ) {
    return { blocks, enqueued: false };
  }

  const next: BlockRecord = {
    handle: input.handle,
    userId: input.userId ?? current?.userId,
    tag: input.tag ?? current?.tag,
    status: 'pending',
    confirmed: false,
    queuedAt: current?.queuedAt ?? now,
    updatedAt: now,
  };
  const merged = { ...blocks, [input.handle]: next };
  return { blocks: pruneBlocks(merged, now), enqueued: true };
}

export function markBlocking(
  record: BlockRecord,
  now = Date.now(),
): BlockRecord {
  return { ...record, status: 'blocking', updatedAt: now };
}

export function applyBlockReport(
  record: BlockRecord | undefined,
  report: { ok: boolean; confirmed?: boolean; error?: string },
  now = Date.now(),
): BlockRecord {
  const handle = record?.handle ?? '';
  if (report.ok && report.confirmed !== false) {
    return {
      handle,
      userId: record?.userId,
      tag: record?.tag,
      status: 'blocked',
      confirmed: true,
      queuedAt: record?.queuedAt ?? now,
      updatedAt: now,
    };
  }
  return {
    handle,
    userId: record?.userId,
    tag: record?.tag,
    status: 'failed',
    confirmed: false,
    error: report.error ?? 'Block failed',
    queuedAt: record?.queuedAt ?? now,
    updatedAt: now,
  };
}

export function reclaimStale(
  blocks: Record<string, BlockRecord>,
  now = Date.now(),
): Record<string, BlockRecord> {
  const next = { ...blocks };
  for (const [handle, record] of Object.entries(next)) {
    if (
      record.status === 'blocking' &&
      now - record.updatedAt >= STALE_BLOCKING_MS
    ) {
      next[handle] = { ...record, status: 'pending', updatedAt: now };
    }
  }
  return next;
}

/**
 * Content-script drain entry. When auto-block is off, leave pending jobs
 * untouched (do not claim / mark blocking) so they do not auto-drain.
 */
export function claimJobsForDrain(
  blocks: Record<string, BlockRecord>,
  autoBlockEnabled: boolean,
  now = Date.now(),
  limit = CLAIM_BATCH,
): { blocks: Record<string, BlockRecord>; claimed: BlockRecord[] } {
  if (!autoBlockEnabled) return { blocks, claimed: [] };
  return claimJobs(blocks, now, limit);
}

export function claimJobs(
  blocks: Record<string, BlockRecord>,
  now = Date.now(),
  limit = CLAIM_BATCH,
): { blocks: Record<string, BlockRecord>; claimed: BlockRecord[] } {
  const reclaimed = reclaimStale(blocks, now);
  const pending = Object.values(reclaimed)
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.queuedAt - b.queuedAt)
    .slice(0, limit);

  if (!pending.length) return { blocks: reclaimed, claimed: [] };

  const next = { ...reclaimed };
  const claimed: BlockRecord[] = [];
  for (const record of pending) {
    const blocking = markBlocking(record, now);
    next[record.handle] = blocking;
    claimed.push(blocking);
  }
  return { blocks: next, claimed };
}

export function pruneBlocks(
  blocks: Record<string, BlockRecord>,
  now = Date.now(),
): Record<string, BlockRecord> {
  const records = Object.values(blocks);
  if (records.length <= BLOCK_STORE_LIMIT) return blocks;

  const keep = new Set<string>();
  for (const record of records) {
    if (
      record.status === 'pending' ||
      record.status === 'blocking' ||
      record.confirmed
    ) {
      keep.add(record.handle);
    }
  }

  const extras = records
    .filter((r) => !keep.has(r.handle))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const room = Math.max(0, BLOCK_STORE_LIMIT - keep.size);
  for (const record of extras.slice(0, room)) keep.add(record.handle);

  const next: Record<string, BlockRecord> = {};
  for (const record of records) {
    if (keep.has(record.handle)) next[record.handle] = record;
  }
  void now;
  return next;
}

export function recentBlocks(
  blocks: Record<string, BlockRecord>,
  limit = 80,
): BlockRecord[] {
  return Object.values(blocks)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function statusRank(status: BlockStatus): number {
  if (status === 'pending') return 0;
  if (status === 'blocking') return 1;
  if (status === 'failed') return 2;
  return 3;
}
