import type { Settings, TagDefinition } from './types';

/** Default hide set: noisy / promotional buckets. User-editable. */
export const DEFAULT_HIDE_TAGS = ['spam', 'promo', 'crypto'] as const;

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
  hideTags: [...DEFAULT_HIDE_TAGS],
  cacheTtlHours: DEFAULT_TTL_HOURS,
};

export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const JEV_MODEL = 'jev-latest';

export const PRIMARY_TAG_INSTRUCTIONS =
  'Pick the best tag for this X/Twitter account based on the state.';

export const SHOULD_HIDE_INSTRUCTIONS =
  'Is this account the kind the user would typically want filtered (spam, ragebait, crypto promo, etc.)?';

export const SHOULD_HIDE_CRITERIA = {
  true: 'Spam, ragebait, crypto promo, scams, engagement bait, or similar noise the user would typically filter.',
  false:
    'A normal person, journalist, or topical poster the user would usually keep in the feed.',
} as const;

export const LOG_LIMIT = 40;
export const MIN_JEV_INTERVAL_MS = 220;
export const VIEWPORT_DEBOUNCE_MS = 160;
export const MAX_RECENT_TEXT = 480;
export const MAX_BIO = 280;
