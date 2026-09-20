import { MIN_BLOCK_INTERVAL_MS, VIEWPORT_DEBOUNCE_MS } from '@/lib/defaults';
import {
  extractAuthor,
  extractProfileAccount,
  findTweetArticles,
  mergeRecentText,
  viewerHandle,
} from '@/lib/extract';
import { claimBlockJobs, reportBlock, tagAccount } from '@/lib/messaging';
import { blocksItem, settingsItem } from '@/lib/storage';
import { blockOnPage } from '@/lib/xblock-page';
import type { AccountState, BlockRecord, TagResult } from '@/lib/types';
import './style.css';

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',
  main(ctx) {
    const handleTags = new Map<string, TagResult>();
    const articleMeta = new WeakMap<HTMLElement, { handle: string }>();
    const recentByHandle = new Map<string, string>();
    const queued = new Set<string>();
    const timers = new Map<string, number>();
    let blockByHandle = new Map<string, BlockRecord>();
    let bannerShown = false;
    let draining = false;
    let selfHandle: string | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const article = entry.target;
          if (!(article instanceof HTMLElement)) continue;
          scheduleTag(article);
        }
      },
      { root: null, rootMargin: '120px 0px', threshold: 0.05 },
    );

    function blockStatus(handle: string): BlockRecord | undefined {
      return blockByHandle.get(handle);
    }

    function paint(article: HTMLElement, result: TagResult): void {
      const record = blockStatus(result.handle);
      const pending =
        record?.status === 'pending' || record?.status === 'blocking';
      article.classList.toggle('jev-block-pending', Boolean(pending));
      if (pending) article.setAttribute('data-jev-pending', '1');
      else article.removeAttribute('data-jev-pending');

      const userName = article.querySelector('[data-testid="User-Name"]');
      if (!userName) return;
      let badge = article.querySelector<HTMLElement>('.jev-tag-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'jev-tag-badge';
        userName.append(badge);
      }
      badge.dataset.jevTag = result.tag;
      const suffix =
        record?.status === 'blocked'
          ? ' · blocked'
          : record?.status === 'failed'
            ? ' · block failed'
            : pending
              ? ' · blocking…'
              : '';
      badge.textContent = `${result.tag}${suffix}`;
      badge.title = record?.error
        ? `Jev ${result.tag}: ${record.error}`
        : result.cached
          ? `Jev tag (cached): ${result.tag}`
          : `Jev tag: ${result.tag}`;
    }

    function repaintAll(): void {
      for (const article of findTweetArticles()) {
        const meta = articleMeta.get(article);
        if (!meta) continue;
        const result = handleTags.get(meta.handle);
        if (result) paint(article, result);
        else article.classList.remove('jev-block-pending');
      }
    }

    function showMissingKeyBanner(): void {
      if (bannerShown) return;
      bannerShown = true;
      const primary = document.querySelector('main') ?? document.body;
      const bar = document.createElement('div');
      bar.className = 'jev-missing-key';
      bar.textContent =
        'Jev X Tags: 未设置 TypeSafe API Key。打开扩展弹窗粘贴密钥后刷新时间线。 / Paste a TypeSafe API key in the extension popup.';
      primary.prepend(bar);
    }

    function rememberRecent(state: AccountState): AccountState {
      const merged = mergeRecentText(
        recentByHandle.get(state.handle) ?? '',
        state.recentText,
      );
      recentByHandle.set(state.handle, merged);
      return { ...state, recentText: merged };
    }

    function scheduleState(state: AccountState, article?: HTMLElement): void {
      if (selfHandle && state.handle === selfHandle) return;
      const next = rememberRecent(state);
      if (article) articleMeta.set(article, { handle: next.handle });

      const known = handleTags.get(next.handle);
      if (known) {
        if (article) paint(article, known);
        return;
      }
      if (queued.has(next.handle)) return;

      const prev = timers.get(next.handle);
      if (prev) window.clearTimeout(prev);
      const id = window.setTimeout(() => {
        timers.delete(next.handle);
        void requestTag(next, article);
      }, VIEWPORT_DEBOUNCE_MS);
      timers.set(next.handle, id);
    }

    function scheduleTag(article: HTMLElement): void {
      const state = extractAuthor(article);
      if (!state) return;
      scheduleState(state, article);
    }

    async function requestTag(
      state: AccountState,
      article?: HTMLElement,
    ): Promise<void> {
      if (handleTags.has(state.handle) || queued.has(state.handle)) {
        const known = handleTags.get(state.handle);
        if (known && article) paint(article, known);
        return;
      }
      queued.add(state.handle);
      try {
        const res = await tagAccount(rememberRecent(state));
        if (!res.ok) {
          if (res.code === 'NO_KEY') showMissingKeyBanner();
          return;
        }
        handleTags.set(state.handle, res.result);
        for (const other of findTweetArticles()) {
          const meta = articleMeta.get(other);
          if (meta?.handle === state.handle) paint(other, res.result);
        }
        if (res.shouldBlock && !res.alreadyBlocked) void drainQueue();
      } catch {
        // fail-open: leave the user visible
      } finally {
        queued.delete(state.handle);
      }
    }

    async function drainQueue(): Promise<void> {
      if (draining) return;
      draining = true;
      try {
        while (true) {
          const res = await claimBlockJobs();
          if (!res.ok || !res.jobs.length) break;
          for (const job of res.jobs) {
            blockByHandle.set(job.handle, job);
            repaintAll();
            if (selfHandle && job.handle === selfHandle) {
              await reportBlock({
                handle: job.handle,
                ok: false,
                confirmed: false,
                error: 'Refusing to block the logged-in account',
              });
              continue;
            }
            const result = await blockOnPage(job.handle, job.userId);
            await reportBlock({
              handle: job.handle,
              ok: result.ok,
              confirmed: result.confirmed,
              error: result.error,
            });
            await new Promise((r) => setTimeout(r, MIN_BLOCK_INTERVAL_MS));
          }
        }
      } finally {
        draining = false;
      }
    }

    function observeFeed(): void {
      selfHandle = viewerHandle() ?? selfHandle;
      for (const article of findTweetArticles()) {
        io.observe(article);
        const state = extractAuthor(article);
        if (!state) continue;
        articleMeta.set(article, { handle: state.handle });
        const known = handleTags.get(state.handle);
        if (known) paint(article, known);
      }
      const profile = extractProfileAccount();
      if (profile) scheduleState(profile);
    }

    async function boot(): Promise<void> {
      const stored = (await blocksItem.getValue()) ?? {};
      blockByHandle = new Map(Object.entries(stored));
      observeFeed();
      void drainQueue();
    }

    const mo = new MutationObserver(() => observeFeed());
    mo.observe(document.documentElement, { childList: true, subtree: true });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      bannerShown = false;
      observeFeed();
      void drainQueue();
    });

    const unwatchSettings = settingsItem.watch(() => {
      repaintAll();
    });

    const unwatchBlocks = blocksItem.watch((next) => {
      blockByHandle = new Map(Object.entries(next ?? {}));
      repaintAll();
      const hasPending = Object.values(next ?? {}).some(
        (r) => r.status === 'pending',
      );
      if (hasPending) void drainQueue();
    });

    ctx.onInvalidated(() => {
      mo.disconnect();
      io.disconnect();
      unwatchSettings();
      unwatchBlocks();
      for (const id of timers.values()) window.clearTimeout(id);
    });

    void boot();
  },
});
