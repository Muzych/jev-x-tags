import { MAX_BIO, MAX_RECENT_TEXT } from './defaults';
import { handleFromPath, isLikelyHandle, normalizeHandle } from './handles';
import type { AccountState } from './types';

const TWEET_SELECTOR = 'article[data-testid="tweet"]';

/** Tweet author row, some layouts, and profile header. */
export const NAME_HOST_SELECTOR =
  '[data-testid="User-Name"], [data-testid="User-Names"], [data-testid="UserName"]';

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

export function findNameHosts(root: ParentNode = document): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(NAME_HOST_SELECTOR)];
}

export function handleFromUserName(userName: Element): string | null {
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

export function pageBio(root: ParentNode = document): string {
  const desc = root.querySelector('[data-testid="UserDescription"]');
  return desc ? clip(textOf(desc), MAX_BIO) : '';
}

export function extractUserId(root: Element): string | undefined {
  for (const el of root.querySelectorAll('[data-testid$="-follow"], [data-testid$="-unfollow"]')) {
    const id = el.getAttribute('data-testid')?.match(/^(\d+)-(?:un)?follow$/)?.[1];
    if (id) return id;
  }
  for (const a of root.querySelectorAll('a[href*="/i/user/"]')) {
    const id = (a.getAttribute('href') ?? '').match(/\/i\/user\/(\d+)/)?.[1];
    if (id) return id;
  }
  return restIdFromFiber(root);
}

/** Walk a few React fiber parents for rest_id — X often stores it there. */
function restIdFromFiber(root: Element): string | undefined {
  const fiberKey = Object.keys(root).find((k) => k.startsWith('__reactFiber'));
  if (!fiberKey) return undefined;
  let fiber: { return?: unknown; memoizedProps?: Record<string, unknown> } | undefined =
    (root as unknown as Record<string, unknown>)[fiberKey] as
      | { return?: unknown; memoizedProps?: Record<string, unknown> }
      | undefined;

  for (let i = 0; i < 36 && fiber; i++) {
    const props = fiber.memoizedProps;
    const id = numericIdFromProps(props);
    if (id) return id;
    fiber = fiber.return as typeof fiber;
  }
  return undefined;
}

function numericIdFromProps(props: Record<string, unknown> | undefined): string | undefined {
  if (!props) return undefined;
  const user = isRecord(props.user) ? props.user : undefined;
  const tweet = isRecord(props.tweet) ? props.tweet : undefined;
  const core = tweet && isRecord(tweet.core) ? tweet.core : undefined;
  const userResults =
    core && isRecord(core.user_results)
      ? core.user_results
      : isRecord(props.user_results)
        ? props.user_results
        : undefined;
  const result = userResults && isRecord(userResults.result) ? userResults.result : undefined;

  const candidates = [
    props.rest_id,
    props.userId,
    props.user_id_str,
    user?.rest_id,
    user?.id_str,
    result?.rest_id,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && /^\d{4,}$/.test(value)) return value;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeRecentText(existing: string, next: string): string {
  const parts = [existing, next]
    .flatMap((chunk) => chunk.split(/\s*\|\s*/))
    .map((part) => part.trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.includes(part)) unique.push(part);
  }
  return clip(unique.slice(0, 4).join(' | '), MAX_RECENT_TEXT);
}

export function extractAuthor(article: Element): AccountState | null {
  const userName = article.querySelector(NAME_HOST_SELECTOR);

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
  const bio = bioNear(article) || pageBio(article.ownerDocument ?? document);

  return {
    handle,
    displayName,
    bio,
    recentText,
    userId: extractUserId(article),
  };
}

export function extractProfileAccount(
  root: ParentNode = document,
  pathname = location.pathname,
): AccountState | null {
  if (/\/status\//.test(pathname)) return null;
  const handle = handleFromPath(pathname);
  if (!handle) return null;

  const userName = root.querySelector(NAME_HOST_SELECTOR);
  const displayName = userName
    ? displayNameFromUserName(userName, handle)
    : handle;
  const bio = pageBio(root);

  const texts: string[] = [];
  for (const article of findTweetArticles(root)) {
    const author = extractAuthor(article);
    if (author?.handle === handle && author.recentText) {
      texts.push(author.recentText);
    }
  }

  const scope = root instanceof Element ? root : root.querySelector('main') ?? document.body;
  return {
    handle,
    displayName,
    bio,
    recentText: clip(texts.join(' | '), MAX_RECENT_TEXT),
    userId: scope instanceof Element ? extractUserId(scope) : undefined,
  };
}

export function viewerHandle(root: ParentNode = document): string | null {
  const profile = root.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  if (profile instanceof HTMLAnchorElement) {
    return handleFromPath(hrefPath(profile));
  }
  return null;
}
