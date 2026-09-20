/** X/Twitter nav paths that are not user handles. */
const RESERVED = new Set([
  'home',
  'explore',
  'search',
  'settings',
  'i',
  'compose',
  'messages',
  'notifications',
  'hashtag',
  'intent',
  'share',
  'privacy',
  'tos',
  'login',
  'signup',
  'jobs',
  'communities',
  'premium',
  'about',
  'help',
  'tos',
  'download',
  'logout',
]);

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').split(/[/?#]/)[0]?.toLowerCase() ?? '';
}

export function isLikelyHandle(raw: string): boolean {
  const handle = normalizeHandle(raw);
  return HANDLE_RE.test(handle) && !RESERVED.has(handle);
}

/** Pull a handle from `/name` or `/name/status/123`. */
export function handleFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const candidate = parts[0];
  if (!candidate || !isLikelyHandle(candidate)) return null;
  return normalizeHandle(candidate);
}
