import type { Settings, TagDefinition } from './types';

/** Shipped empty: users add their own auto-block set. */
export const DEFAULT_BLOCK_TAGS: readonly string[] = [];

/** @deprecated Use DEFAULT_BLOCK_TAGS. Kept so old comments/docs still grep. */
export const DEFAULT_HIDE_TAGS = DEFAULT_BLOCK_TAGS;

/** Shipped empty: users add their own Jev choice ids. */
export const DEFAULT_TAGS: TagDefinition[] = [];

export const DEFAULT_TTL_HOURS = 168;

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  tags: [...DEFAULT_TAGS],
  blockTags: [...DEFAULT_BLOCK_TAGS],
  autoBlockEnabled: false,
  cacheTtlHours: DEFAULT_TTL_HOURS,
};

export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const JEV_MODEL = 'jev-latest';

export const PRIMARY_TAG_INSTRUCTIONS =
  'Pick the best tag for this X/Twitter account based on the state (display name, handle, bio, and recent comments/posts).';

export const SHOULD_HIDE_INSTRUCTIONS =
  'Is this account the kind the user would typically want blocked (spam, ragebait, crypto promo, etc.)?';

export const SHOULD_HIDE_CRITERIA = {
  true: 'Spam, ragebait, crypto promo, scams, engagement bait, or similar noise the user would typically block.',
  false:
    'A normal person, journalist, or topical poster the user would usually keep following.',
} as const;

export const LOG_LIMIT = 40;
export const BLOCK_STORE_LIMIT = 240;
export const MIN_JEV_INTERVAL_MS = 220;
export const MIN_BLOCK_INTERVAL_MS = 900;
export const VIEWPORT_DEBOUNCE_MS = 160;
/** Coalesce X timeline MutationObserver scans (not Jev). */
export const FEED_SCAN_MS = 280;
export const MAX_RECENT_TEXT = 480;
export const MAX_BIO = 280;
export const STALE_BLOCKING_MS = 45_000;
export const AUTO_RETRY_FAILED_MS = 60 * 60 * 1000;
export const CLAIM_BATCH = 3;
