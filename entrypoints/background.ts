import { isFresh, pruneCache } from '@/lib/cache';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { MIN_JEV_INTERVAL_MS } from '@/lib/defaults';
import { normalizeHandle } from '@/lib/handles';
import {
  JEV_ENDPOINT,
  buildJevRequest,
  jevHeaders,
  parseJevResponse,
} from '@/lib/jev';
import {
  appendLog,
  cacheItem,
  clearCacheAndLog,
  logItem,
  readSettings,
  writeSettings,
} from '@/lib/storage';
import type { AccountState, CacheEntry, Message, Response } from '@/lib/types';

export default defineBackground(() => {
  const inflight = new Map<string, Promise<Response>>();
  let nextSlot = 0;

  async function pace(): Promise<void> {
    const now = Date.now();
    const wait = nextSlot - now;
    nextSlot = Math.max(now, nextSlot) + MIN_JEV_INTERVAL_MS;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
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
      return {
        ok: true,
        result: { ...cached, handle, cached: true },
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
        return { ok: true, result: { ...entry, handle, cached: false } };
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
      case 'GET_STATUS': {
        const settings = await readSettings();
        const cache = pruneCache((await cacheItem.getValue()) ?? {}, settings.cacheTtlHours);
        await cacheItem.setValue(cache);
        return {
          ok: true,
          hasKey: Boolean(settings.apiKey),
          cacheSize: Object.keys(cache).length,
          log: (await logItem.getValue()) ?? [],
        };
      }
      default:
        return { ok: false, code: 'API', error: 'Unknown message' };
    }
  }

  browser.runtime.onMessage.addListener((message: Message) => handleMessage(message));
});
