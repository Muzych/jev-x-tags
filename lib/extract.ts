import { MAX_BIO, MAX_RECENT_TEXT } from './defaults';
import { handleFromPath, isLikelyHandle, normalizeHandle } from './handles';
import type { AccountState } from './types';

const TWEET_SELECTOR = 'article[data-testid="tweet"]';

export function findTweetArticles(root: ParentNode = document): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TWEET_SELECTOR)];
}

function clip(text: string, max: number): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return compact.slice(0, max);
}

function textOf(el: Element | null | undefined): string {
  return el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function hrefPath(anchor: HTMLAnchorElement): string {
  try {
    const url = new URL(anchor.href, 'https://x.com');
    return url.pathname;
  } catch {
    return anchor.getAttribute('href') ?? '';
  }
}

function handleFromUserName(userName: Element): string | null {
  const at = [...userName.querySelectorAll('span')].find((span) =>
    span.textContent?.trim().startsWith('@'),
  );
  if (at) {
    const handle = normalizeHandle(at.textContent ?? '');
    if (isLikelyHandle(handle)) return handle;
  }

  for (const a of userName.querySelectorAll('a[href]')) {
    const handle = handleFromPath(hrefPath(a as HTMLAnchorElement));
    if (handle) return handle;
  }
  return null;
}

function displayNameFromUserName(userName: Element, handle: string): string {
  for (const a of userName.querySelectorAll('a[href]')) {
    const label = textOf(a);
    if (!label) continue;
    if (normalizeHandle(label) === handle) continue;
    if (label.startsWith('@')) continue;
    return label;
  }
  const first = textOf(userName.querySelector('a'));
  if (first && !first.startsWith('@')) return first;
  return handle;
}

function bioNear(article: Element): string {
  const inside = article.querySelector('[data-testid="UserDescription"]');
  if (inside) return clip(textOf(inside), MAX_BIO);

  const cell = article.closest('[data-testid="cellInnerDiv"]') ?? article;
  const nearby = cell.querySelector('[data-testid="UserDescription"]');
  if (nearby) return clip(textOf(nearby), MAX_BIO);
  return '';
}

export function extractAuthor(article: Element): AccountState | null {
  const userName =
    article.querySelector('[data-testid="User-Name"]') ??
    article.querySelector('[data-testid="User-Names"]');

  let handle: string | null = userName ? handleFromUserName(userName) : null;

  if (!handle) {
    for (const a of article.querySelectorAll('a[href]')) {
      const path = hrefPath(a as HTMLAnchorElement);
      if (path.includes('/status/')) continue;
      handle = handleFromPath(path);
      if (handle) break;
    }
  }

  if (!handle) return null;

  const displayName = userName
    ? displayNameFromUserName(userName, handle)
    : handle;
  const recentText = clip(
    textOf(article.querySelector('[data-testid="tweetText"]')),
    MAX_RECENT_TEXT,
  );

  return {
    handle,
    displayName,
    bio: bioNear(article),
    recentText,
  };
}
