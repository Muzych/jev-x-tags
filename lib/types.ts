export interface TagDefinition {
  id: string;
  description: string;
}

export interface Settings {
  apiKey: string;
  tags: TagDefinition[];
  hideTags: string[];
  cacheTtlHours: number;
}

export interface AccountState {
  handle: string;
  displayName: string;
  bio: string;
  recentText: string;
}

export interface CacheEntry {
  tag: string;
  confidence?: number;
  shouldHideCandidate: number;
  taggedAt: number;
}

export interface TagResult extends CacheEntry {
  handle: string;
  cached: boolean;
}

export interface LogEntry {
  handle: string;
  tag?: string;
  confidence?: number;
  shouldHideCandidate?: number;
  source: 'cache' | 'api' | 'error';
  message?: string;
  at: number;
}

export type Message =
  | { type: 'TAG_ACCOUNT'; payload: AccountState }
  | { type: 'GET_SETTINGS' }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'GET_STATUS' }
  | { type: 'CLEAR_CACHE' };

export type TagAccountOk = { ok: true; result: TagResult };
export type SettingsOk = { ok: true; settings: Settings };
export type StatusOk = {
  ok: true;
  hasKey: boolean;
  cacheSize: number;
  log: LogEntry[];
};
export type SimpleOk = { ok: true };
export type Fail = {
  ok: false;
  error: string;
  code: 'NO_KEY' | 'API' | 'NETWORK' | 'BAD_RESPONSE';
};

export type Response = TagAccountOk | SettingsOk | StatusOk | SimpleOk | Fail;

export interface JevChoiceAnswer {
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

export interface JevNoulAnswer {
  noul: number;
}

export interface JevResponseBody {
  answers?: {
    primary_tag?: JevChoiceAnswer;
    should_hide_candidate?: JevNoulAnswer;
  };
}
