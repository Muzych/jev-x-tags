import {
  applyBlockReport,
  claimJobs,
  enqueueBlock,
  isConfirmedBlock,
  listMatchingHandles,
  recentBlocks,
  shouldSkipAutoEnqueue,
  summarizeBlocks,
} from '@/lib/block';
import { isFresh, pruneCache } from '@/lib/cache';
import { DEFAULT_SETTINGS, MIN_JEV_INTERVAL_MS } from '@/lib/defaults';
import { normalizeHandle } from '@/lib/handles';
import {
  JEV_ENDPOINT,
  buildJevRequest,
  jevHeaders,
  parseJevResponse,
} from '@/lib/jev';
import { shouldBlockByTag } from '@/lib/match';
import {
  appendLog,
  cacheItem,
  clearCacheAndLog,
  logItem,
  readBlocks,
  readSettings,
  writeBlocks,
  writeSettings,
} from '@/lib/storage';
import type {
  AccountState,
  BlockRecord,
  CacheEntry,
  Message,
  Response,
} from '@/lib/types';

export default defineBackground(() => {
  const inflight = new Map<string, Promise<Response>>();
  let nextSlot = 0;

  async function pace(): Promise<void> {
    const now = Date.now();
    const wait = nextSlot - now;
    nextSlot = Math.max(now, nextSlot) + MIN_JEV_INTERVAL_MS;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  async function maybeEnqueue(
    handle: string,
    tag: string,
    userId: string | undefined,
    force: boolean,
  ): Promise<{ enqueued: boolean; alreadyBlocked: boolean }> {
    const settings = await readSettings();
    const current = (await readBlocks())[handle];
    if (isConfirmedBlock(current)) {
      return { enqueued: false, alreadyBlocked: true };
    }
    if (!shouldBlockByTag(tag, settings.blockTags)) {
      return { enqueued: false, alreadyBlocked: false };
    }
    if (!force && shouldSkipAutoEnqueue(current)) {
      return { enqueued: false, alreadyBlocked: false };
    }
    const { blocks, enqueued } = enqueueBlock(
      await readBlocks(),
      { handle, userId, tag, force },
    );
    if (enqueued) {
      await writeBlocks(blocks);
      await appendLog({
        handle,
        tag,
        source: 'block',
        message: 'queued for platform block',
        at: Date.now(),
      });
    }
    return { enqueued, alreadyBlocked: false };
  }

  async function tagFromJev(state: AccountState): Promise<Response> {
    const settings = await readSettings();
    const handle = normalizeHandle(state.handle);
    if (!handle) {
      return { ok: false, code: 'BAD_RESPONSE', error: 'Missing handle' };
    }

    if (!settings.apiKey) {
      await appendLog({
        handle,
        source: 'error',
        message: 'API key missing',
        at: Date.now(),
      });
      return {
        ok: false,
        code: 'NO_KEY',
        error: 'Paste a TypeSafe API key in the extension popup or options.',
      };
    }

    const cache = (await cacheItem.getValue()) ?? {};
    const cached = cache[handle];
    if (isFresh(cached, settings.cacheTtlHours)) {
      await appendLog({
        handle,
        tag: cached.tag,
        confidence: cached.confidence,
        shouldHideCandidate: cached.shouldHideCandidate,
        source: 'cache',
        at: Date.now(),
      });
      const shouldBlock = shouldBlockByTag(cached.tag, settings.blockTags);
      const queued = shouldBlock
        ? await maybeEnqueue(handle, cached.tag, state.userId ?? cached.userId, false)
        : { enqueued: false, alreadyBlocked: isConfirmedBlock((await readBlocks())[handle]) };
      return {
        ok: true,
        result: { ...cached, handle, cached: true },
        shouldBlock,
        alreadyBlocked: queued.alreadyBlocked,
      };
    }

    const pending = inflight.get(handle);
    if (pending) return pending;

    const job = (async (): Promise<Response> => {
      await pace();
      try {
        const body = buildJevRequest(
          { ...state, handle },
          settings.tags?.length ? settings.tags : DEFAULT_SETTINGS.tags,
        );
        const res = await fetch(JEV_ENDPOINT, {
          method: 'POST',
          headers: jevHeaders(settings.apiKey),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          const message = `Jev HTTP ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`;
          await appendLog({
            handle,
            source: 'error',
            message,
            at: Date.now(),
          });
          return { ok: false, code: 'API', error: message };
        }
        const json: unknown = await res.json();
        const parsed = parseJevResponse(json);
        const entry: CacheEntry = {
          tag: parsed.tag,
          confidence: parsed.confidence,
          shouldHideCandidate: parsed.shouldHideCandidate,
          taggedAt: Date.now(),
          userId: state.userId,
        };
        const latest = (await cacheItem.getValue()) ?? {};
        latest[handle] = entry;
        await cacheItem.setValue(latest);
        await appendLog({
          handle,
          tag: entry.tag,
          confidence: entry.confidence,
          shouldHideCandidate: entry.shouldHideCandidate,
          source: 'api',
          at: entry.taggedAt,
        });
        const shouldBlock = shouldBlockByTag(entry.tag, settings.blockTags);
        const queued = shouldBlock
          ? await maybeEnqueue(handle, entry.tag, state.userId, false)
          : { enqueued: false, alreadyBlocked: isConfirmedBlock((await readBlocks())[handle]) };
        return {
          ok: true,
          result: { ...entry, handle, cached: false },
          shouldBlock,
          alreadyBlocked: queued.alreadyBlocked,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code = message.startsWith('Jev response')
          ? 'BAD_RESPONSE'
          : 'NETWORK';
        await appendLog({
          handle,
          source: 'error',
          message,
          at: Date.now(),
        });
        return { ok: false, code, error: message };
      } finally {
        inflight.delete(handle);
      }
    })();

    inflight.set(handle, job);
    return job;
  }

  async function statusPayload(): Promise<Response> {
    const settings = await readSettings();
    const cache = pruneCache(
      (await cacheItem.getValue()) ?? {},
      settings.cacheTtlHours,
    );
    await cacheItem.setValue(cache);
    const blocks = await readBlocks();
    return {
      ok: true,
      hasKey: Boolean(settings.apiKey),
      cacheSize: Object.keys(cache).length,
      log: (await logItem.getValue()) ?? [],
      blocks: recentBlocks(blocks),
      blockCounts: summarizeBlocks(blocks),
    };
  }

  async function handleMessage(message: Message): Promise<Response> {
    switch (message.type) {
      case 'TAG_ACCOUNT':
        return tagFromJev(message.payload);
      case 'GET_SETTINGS':
        return { ok: true, settings: await readSettings() };
      case 'SET_SETTINGS':
        await writeSettings(message.payload);
        return { ok: true, settings: await readSettings() };
      case 'CLEAR_CACHE':
        await clearCacheAndLog();
        return { ok: true };
      case 'GET_STATUS':
        return statusPayload();
      case 'CLAIM_BLOCK_JOBS': {
        const { blocks, claimed } = claimJobs(await readBlocks());
        await writeBlocks(blocks);
        return { ok: true, jobs: claimed };
      }
      case 'REPORT_BLOCK': {
        const handle = normalizeHandle(message.payload.handle);
        const current = (await readBlocks())[handle];
        const next: BlockRecord = applyBlockReport(current ?? {
          handle,
          status: 'pending',
          confirmed: false,
          queuedAt: Date.now(),
          updatedAt: Date.now(),
        }, message.payload);
        const blocks = { ...(await readBlocks()), [handle]: next };
        await writeBlocks(blocks);
        await appendLog({
          handle,
          tag: next.tag,
          source: 'block',
          message: next.confirmed
            ? 'blocked (confirmed)'
            : next.error ?? 'block failed',
          at: next.updatedAt,
        });
        return { ok: true };
      }
      case 'BLOCK_ALL_MATCHING': {
        const settings = await readSettings();
        const cache = (await cacheItem.getValue()) ?? {};
        const matches = listMatchingHandles(cache, settings.blockTags);
        let queued = 0;
        let skipped = 0;
        let blocks = await readBlocks();
        for (const handle of matches) {
          if (isConfirmedBlock(blocks[handle])) {
            skipped += 1;
            continue;
          }
          const result = enqueueBlock(
            blocks,
            {
              handle,
              userId: cache[handle]?.userId,
              tag: cache[handle]?.tag,
              force: true,
            },
          );
          blocks = result.blocks;
          if (result.enqueued) queued += 1;
          else skipped += 1;
        }
        await writeBlocks(blocks);
        await appendLog({
          handle: '*',
          source: 'block',
          message: `block-all queued ${queued}, skipped ${skipped}`,
          at: Date.now(),
        });
        return {
          ok: true,
          queued,
          skipped,
          blockCounts: summarizeBlocks(blocks),
        };
      }
      default:
        return { ok: false, code: 'API', error: 'Unknown message' };
    }
  }

  browser.runtime.onMessage.addListener((message: Message) => handleMessage(message));
});
