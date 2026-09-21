import type { Settings, TagDefinition } from './types';

/** Default auto-block set: noisy / promotional buckets. User-editable. */
export const DEFAULT_BLOCK_TAGS = ['spam', 'promo', 'crypto'] as const;

/** @deprecated Use DEFAULT_BLOCK_TAGS. Kept so old comments/docs still grep. */
export const DEFAULT_HIDE_TAGS = DEFAULT_BLOCK_TAGS;

export const DEFAULT_TAGS: TagDefinition[] = [
  {
    id: 'spam',
    description:
      'Scam, bot, fake giveaway, follow-for-follow, or low-quality engagement bait.',
  },
  {
    id: 'promo',
    description:
      'Mostly advertising a product, service, affiliate link, or self-promotion.',
  },
  {
    id: 'crypto',
    description:
      'Token shills, NFT pumps, trading signals, or crypto-promotional accounts.',
  },
  {
    id: 'politics',
    description:
      'Political commentary, activism, elections, or partisan talking points.',
  },
  {
    id: 'news',
    description:
      'Journalists, outlets, or accounts that mainly share current events.',
  },
  {
    id: 'tech',
    description:
      'Software, AI, hardware, startups, or engineering discussion.',
  },
  {
    id: 'personal',
    description:
      'Personal life, friends, diary-style posts — not topical media.',
  },
  {
    id: 'meme',
    description: 'Memes, jokes, shitposts, or humor-first accounts.',
  },
  {
    id: 'other',
    description: 'Does not fit a more specific tag.',
  },
];

export const DEFAULT_TTL_HOURS = 168;

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  tags: DEFAULT_TAGS,
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
export const MAX_RECENT_TEXT = 480;
export const MAX_BIO = 280;
export const STALE_BLOCKING_MS = 45_000;
export const AUTO_RETRY_FAILED_MS = 60 * 60 * 1000;
export const CLAIM_BATCH = 3;
