export interface TagDefinition {
  id: string;
  description: string;
}

export interface Settings {
  apiKey: string;
  tags: TagDefinition[];
  /** Tags that enqueue a platform account block (not CSS hide). */
  blockTags: string[];
  /**
   * Master safety switch. When false, tagging and match display still run,
   * but jobs are not enqueued and the block API / UI fallback never fire.
   * Pending jobs stay pending (not cancelled) until this is turned on.
   */
  autoBlockEnabled: boolean;
  cacheTtlHours: number;
}

/** Older installs stored hideTags; read path migrates it. */
export type StoredSettings = Partial<Settings> & { hideTags?: string[] };

export interface AccountState {
  handle: string;
  displayName: string;
  bio: string;
  recentText: string;
  userId?: string;
}

export interface CacheEntry {
  tag: string;
  confidence?: number;
  shouldHideCandidate: number;
  taggedAt: number;
  userId?: string;
}

export interface TagResult extends CacheEntry {
  handle: string;
  cached: boolean;
}

export type BlockStatus = 'pending' | 'blocking' | 'blocked' | 'failed';

export interface BlockRecord {
  handle: string;
  userId?: string;
  tag?: string;
  status: BlockStatus;
  confirmed: boolean;
  error?: string;
  queuedAt: number;
  updatedAt: number;
}

export interface BlockCounts {
  pending: number;
  blocking: number;
  blocked: number;
  failed: number;
}

export interface LogEntry {
  handle: string;
  tag?: string;
  confidence?: number;
  shouldHideCandidate?: number;
  source: 'cache' | 'api' | 'error' | 'block';
  message?: string;
  at: number;
}

export type Message =
  | { type: 'TAG_ACCOUNT'; payload: AccountState }
  | { type: 'GET_SETTINGS' }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'GET_STATUS' }
  | { type: 'CLEAR_CACHE' }
  | { type: 'CLAIM_BLOCK_JOBS' }
  | { type: 'REPORT_BLOCK'; payload: BlockReport }
  | { type: 'BLOCK_ALL_MATCHING' };

export interface BlockReport {
  handle: string;
  ok: boolean;
  confirmed?: boolean;
  error?: string;
}

export type TagAccountOk = {
  ok: true;
  result: TagResult;
  shouldBlock: boolean;
  alreadyBlocked: boolean;
};
export type SettingsOk = { ok: true; settings: Settings };
export type StatusOk = {
  ok: true;
  hasKey: boolean;
  cacheSize: number;
  log: LogEntry[];
  blocks: BlockRecord[];
  blockCounts: BlockCounts;
};
export type ClaimJobsOk = { ok: true; jobs: BlockRecord[] };
export type BlockAllOk = {
  ok: true;
  queued: number;
  skipped: number;
  blockCounts: BlockCounts;
};
export type SimpleOk = { ok: true };
export type Fail = {
  ok: false;
  error: string;
  code: 'NO_KEY' | 'API' | 'NETWORK' | 'BAD_RESPONSE' | 'NO_SESSION';
};

export type Response =
  | TagAccountOk
  | SettingsOk
  | StatusOk
  | ClaimJobsOk
  | BlockAllOk
  | SimpleOk
  | Fail;

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
