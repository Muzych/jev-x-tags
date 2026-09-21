import { useMemo, useState } from 'react';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import type { BlockCounts, BlockRecord, LogEntry, Settings, TagDefinition } from '@/lib/types';
import './settings.css';

export interface SettingsPanelProps {
  variant: 'popup' | 'options' | 'preview';
  settings: Settings;
  log: LogEntry[];
  cacheSize: number;
  hasKey: boolean;
  blocks: BlockRecord[];
  blockCounts: BlockCounts;
  busy?: boolean;
  notice?: string | null;
  onSave: (settings: Settings) => Promise<void> | void;
  onClearCache: () => Promise<void> | void;
  onBlockMatching?: () => Promise<void> | void;
  onOpenOptions?: () => void;
}

function formatWhen(at: number): string {
  try {
    return new Date(at).toLocaleString();
  } catch {
    return String(at);
  }
}

export function SettingsPanel({
  variant,
  settings,
  log,
  cacheSize,
  hasKey,
  blocks,
  blockCounts,
  busy,
  notice,
  onSave,
  onClearCache,
  onBlockMatching,
  onOpenOptions,
}: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [tags, setTags] = useState<TagDefinition[]>(settings.tags);
  const [blockTags, setBlockTags] = useState<string[]>(settings.blockTags);
  const [autoBlockEnabled, setAutoBlockEnabled] = useState(
    settings.autoBlockEnabled,
  );
  const [ttl, setTtl] = useState(String(settings.cacheTtlHours));
  const compact = variant === 'popup';

  const blockSet = useMemo(() => new Set(blockTags), [blockTags]);
  const pendingTotal = blockCounts.pending + blockCounts.blocking;

  function toggleBlock(id: string) {
    setBlockTags((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function updateTag(index: number, patch: Partial<TagDefinition>) {
    setTags((cur) => cur.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  async function save() {
    await onSave({
      apiKey,
      tags,
      blockTags,
      autoBlockEnabled,
      cacheTtlHours: Number(ttl) || DEFAULT_SETTINGS.cacheTtlHours,
    });
  }

  return (
    <div className={`jev-app ${compact ? 'is-popup' : 'is-page'}`}>
      <header className="jev-head">
        <div>
          <p className="jev-kicker">TypeSafe Jev · System One</p>
          <h1>Jev X Tags</h1>
          <p className="jev-sub">
            用名字 / 简介 / 评论给 X 账号打标签，再按标签批量拉黑账号。
          </p>
        </div>
        <span className={`jev-pill ${hasKey ? 'ok' : 'warn'}`}>
          {hasKey ? 'Key 已保存' : '缺少 API Key'}
        </span>
      </header>

      {!hasKey && (
        <div className="jev-banner" role="status">
          密钥只存在扩展本地存储，不会写入仓库。没有 key 时不会打标或拉黑（fail-open）。
        </div>
      )}

      {notice && (
        <div className="jev-banner" role="status">
          {notice}
        </div>
      )}

      <section className="jev-card">
        <h2>TypeSafe API Key</h2>
        <label className="jev-label" htmlFor="jev-key">
          Bearer token（粘贴后点保存）
        </label>
        <input
          id="jev-key"
          className="jev-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </section>

      <section className="jev-card">
        <h2>自动拉黑 / Auto-block</h2>
        <label className="jev-switch">
          <input
            type="checkbox"
            checked={autoBlockEnabled}
            onChange={(e) => setAutoBlockEnabled(e.target.checked)}
          />
          <span>
            <strong>启用自动拉黑 Enable auto-block</strong>
            <span className="jev-help">
              关闭时仍会打标签，并标出命中规则的账号，但不会入队、不会调用拉黑
              API、也不会走 UI 拉黑。已排队任务会暂停保留，直到重新打开（不会取消）。
            </span>
          </span>
        </label>
        <p className="jev-help">
          作者的 <code>primary_tag.choice</code> 落在勾选的标签上时算命中。开关打开后才会入队拉黑；关闭时只打标并显示 would block。
          不会再用 CSS 藏帖。Jev 的 noul 只作为建议，不单独拉黑。
        </p>
        <p className="jev-label">自动拉黑标签 Auto-block tags</p>
        <div className="jev-chips">
          {tags.map((tag) => (
            <label key={tag.id} className="jev-chip">
              <input
                type="checkbox"
                checked={blockSet.has(tag.id)}
                onChange={() => toggleBlock(tag.id)}
              />
              <span>{tag.id}</span>
            </label>
          ))}
        </div>
      </section>

      {!compact && (
        <section className="jev-card">
          <div className="jev-row">
            <h2>标签词表 / Jev Choice criteria</h2>
            <button
              type="button"
              className="jev-btn ghost"
              onClick={() =>
                setTags((cur) => [...cur, { id: '', description: '' }])
              }
            >
              添加标签
            </button>
          </div>
          <p className="jev-help">
            这些描述会作为 Jev <code>primary_tag.criteria</code>。
            <code>other</code> 在请求里始终为 <code>null</code>。
          </p>
          <div className="jev-tags">
            {tags.map((tag, index) => (
              <div className="jev-tag-row" key={`${tag.id}-${index}`}>
                <input
                  className="jev-input id"
                  value={tag.id}
                  placeholder="id"
                  onChange={(e) =>
                    updateTag(index, {
                      id: e.target.value.replace(/\s+/g, '_'),
                    })
                  }
                />
                <input
                  className="jev-input"
                  value={tag.description}
                  placeholder="Choice 判定说明"
                  onChange={(e) =>
                    updateTag(index, { description: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="jev-btn ghost"
                  onClick={() => setTags((cur) => cur.filter((_, i) => i !== index))}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="jev-card">
        <h2>拉黑队列 / Block queue</h2>
        <div className="jev-counts" aria-label="block queue counts">
          <span className="jev-count pending">待处理 {pendingTotal}</span>
          <span className="jev-count blocked">已拉黑 {blockCounts.blocked}</span>
          <span className="jev-count failed">失败 {blockCounts.failed}</span>
        </div>
        <p className="jev-help">
          使用当前 x.com 登录会话执行。待处理任务需要打开 X 时间线，且须打开自动拉黑。
          失败会保持账号可见并记入日志，不会假装成功。已确认拉黑的 handle 不会重试。
          开关关闭时已排队任务会暂停，不会自动排空。
        </p>
        {blocks.length === 0 ? (
          <p className="jev-empty">队列是空的。打标匹配后会出现待拉黑账号。</p>
        ) : (
          <ul className="jev-log">
            {blocks.slice(0, compact ? 6 : 24).map((entry) => (
              <li key={`${entry.handle}-${entry.updatedAt}`}>
                <div className="jev-log-top">
                  <strong>@{entry.handle}</strong>
                  <span className={`jev-src ${entry.status}`}>{entry.status}</span>
                </div>
                <p>
                  {entry.tag && (
                    <>
                      tag <code>{entry.tag}</code>
                      {' · '}
                    </>
                  )}
                  {entry.confirmed ? '已确认平台拉黑' : (entry.error ?? '等待 x.com 会话执行')}
                </p>
                <time>{formatWhen(entry.updatedAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="jev-card">
        <h2>缓存</h2>
        <div className="jev-row">
          <label className="jev-label" htmlFor="jev-ttl">
            TTL（小时）
          </label>
          <input
            id="jev-ttl"
            className="jev-input ttl"
            type="number"
            min={1}
            max={720}
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
          />
          <span className="jev-muted">已缓存 {cacheSize} 个账号</span>
        </div>
        <p className="jev-help">清空缓存不会丢掉已确认的拉黑记录，避免重复请求。</p>
      </section>

      <div className="jev-actions">
        <button type="button" className="jev-btn primary" disabled={busy} onClick={() => void save()}>
          保存设置
        </button>
        {onBlockMatching && (
          <button
            type="button"
            className="jev-btn"
            disabled={busy || !autoBlockEnabled}
            title={
              autoBlockEnabled
                ? undefined
                : '打开自动拉黑后再入队 / Turn on auto-block to enqueue'
            }
            onClick={() => void onBlockMatching()}
          >
            立即拉黑所有匹配账号
          </button>
        )}
        <button type="button" className="jev-btn" disabled={busy} onClick={() => void onClearCache()}>
          清空打标缓存与日志
        </button>
        {compact && onOpenOptions && (
          <button type="button" className="jev-btn ghost" onClick={onOpenOptions}>
            打开完整选项
          </button>
        )}
      </div>

      <section className="jev-card">
        <h2>最近打标日志</h2>
        {log.length === 0 ? (
          <p className="jev-empty">还没有日志。打开 x.com 时间线并滚动后会出现。</p>
        ) : (
          <ul className="jev-log">
            {log.slice(0, compact ? 8 : 40).map((entry) => (
              <li key={`${entry.handle}-${entry.at}`}>
                <div className="jev-log-top">
                  <strong>@{entry.handle}</strong>
                  <span className={`jev-src ${entry.source}`}>{entry.source}</span>
                </div>
                <p>
                  {entry.tag ? (
                    <>
                      tag <code>{entry.tag}</code>
                      {entry.confidence != null && (
                        <> · 置信 {entry.confidence.toFixed(2)}</>
                      )}
                      {entry.shouldHideCandidate != null && (
                        <>
                          {' '}
                          · 建议拉黑 {entry.shouldHideCandidate.toFixed(2)}
                        </>
                      )}
                    </>
                  ) : (
                    entry.message ?? '—'
                  )}
                </p>
                {entry.message && (entry.tag || entry.source === 'block') && (
                  <p>{entry.message}</p>
                )}
                <time>{formatWhen(entry.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
