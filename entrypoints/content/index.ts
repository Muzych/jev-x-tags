import { VIEWPORT_DEBOUNCE_MS } from '@/lib/defaults';
import { extractAuthor, findTweetArticles } from '@/lib/extract';
import { applyHidden, shouldHideByTag } from '@/lib/hide';
import { tagAccount } from '@/lib/messaging';
import { settingsItem } from '@/lib/storage';
import type { Settings, TagResult } from '@/lib/types';
import './style.css';

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',
  main(ctx) {
    const handleTags = new Map<string, TagResult>();
    const articleMeta = new WeakMap<HTMLElement, { handle: string }>();
    const queued = new Set<string>();
    const timers = new Map<string, number>();
    let hideTags: string[] = [];
    let bannerShown = false;

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

    function paint(article: HTMLElement, result: TagResult): void {
      applyHidden(article, shouldHideByTag(result.tag, hideTags));
      const userName = article.querySelector('[data-testid="User-Name"]');
      if (!userName) return;
      let badge = article.querySelector<HTMLElement>('.jev-tag-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'jev-tag-badge';
        userName.append(badge);
      }
      badge.dataset.jevTag = result.tag;
      badge.textContent = result.tag;
      badge.title = result.cached
        ? `Jev tag (cached): ${result.tag}`
        : `Jev tag: ${result.tag}`;
    }

    function repaintAll(): void {
      for (const article of findTweetArticles()) {
        const meta = articleMeta.get(article);
        if (!meta) continue;
        const result = handleTags.get(meta.handle);
        if (result) paint(article, result);
        else applyHidden(article, false);
      }
    }

    function showMissingKeyBanner(): void {
      if (bannerShown) return;
      bannerShown = true;
      const primary =
        document.querySelector('main') ?? document.body;
      const bar = document.createElement('div');
      bar.className = 'jev-missing-key';
      bar.textContent =
        'Jev X Tags: 未设置 TypeSafe API Key。打开扩展弹窗粘贴密钥后刷新时间线。 / Paste a TypeSafe API key in the extension popup.';
      primary.prepend(bar);
    }

    function scheduleTag(article: HTMLElement): void {
      const state = extractAuthor(article);
      if (!state) return;
      articleMeta.set(article, { handle: state.handle });

      const known = handleTags.get(state.handle);
      if (known) {
        paint(article, known);
        return;
      }

      if (queued.has(state.handle)) return;
      const prev = timers.get(state.handle);
      if (prev) window.clearTimeout(prev);
      const id = window.setTimeout(() => {
        timers.delete(state.handle);
        void requestTag(article, state);
      }, VIEWPORT_DEBOUNCE_MS);
      timers.set(state.handle, id);
    }

    async function requestTag(
      article: HTMLElement,
      state: { handle: string; displayName: string; bio: string; recentText: string },
    ): Promise<void> {
      if (handleTags.has(state.handle) || queued.has(state.handle)) {
        const known = handleTags.get(state.handle);
        if (known) paint(article, known);
        return;
      }
      queued.add(state.handle);
      try {
        const res = await tagAccount(state);
        if (!res.ok) {
          if (res.code === 'NO_KEY') showMissingKeyBanner();
          // fail-open: leave the post visible
          return;
        }
        handleTags.set(state.handle, res.result);
        for (const other of findTweetArticles()) {
          const meta = articleMeta.get(other);
          if (meta?.handle === state.handle) paint(other, res.result);
        }
      } catch {
        // fail-open
      } finally {
        queued.delete(state.handle);
      }
    }

    function observeFeed(): void {
      for (const article of findTweetArticles()) {
        io.observe(article);
        const state = extractAuthor(article);
        if (!state) continue;
        articleMeta.set(article, { handle: state.handle });
        const known = handleTags.get(state.handle);
        if (known) paint(article, known);
      }
    }

    async function boot(): Promise<void> {
      const settings: Settings = (await settingsItem.getValue()) ?? {
        apiKey: '',
        tags: [],
        hideTags: [],
        cacheTtlHours: 168,
      };
      hideTags = settings.hideTags ?? [];
      observeFeed();
    }

    const mo = new MutationObserver(() => observeFeed());
    mo.observe(document.documentElement, { childList: true, subtree: true });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      bannerShown = false;
      observeFeed();
    });

    const unwatch = settingsItem.watch((next) => {
      hideTags = next?.hideTags ?? [];
      repaintAll();
    });

    ctx.onInvalidated(() => {
      mo.disconnect();
      io.disconnect();
      unwatch();
      for (const id of timers.values()) window.clearTimeout(id);
    });

    void boot();
  },
});
