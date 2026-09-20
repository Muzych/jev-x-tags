import { useMemo, useState } from 'react';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import type { LogEntry, Settings, TagDefinition } from '@/lib/types';
import './settings.css';

export interface SettingsPanelProps {
  variant: 'popup' | 'options' | 'preview';
  settings: Settings;
  log: LogEntry[];
  cacheSize: number;
  hasKey: boolean;
  busy?: boolean;
  notice?: string | null;
  onSave: (settings: Settings) => Promise<void> | void;
  onClearCache: () => Promise<void> | void;
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
  busy,
  notice,
  onSave,
  onClearCache,
  onOpenOptions,
}: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [tags, setTags] = useState<TagDefinition[]>(settings.tags);
  const [hideTags, setHideTags] = useState<string[]>(settings.hideTags);
  const [ttl, setTtl] = useState(String(settings.cacheTtlHours));
  const compact = variant === 'popup';

  const hideSet = useMemo(() => new Set(hideTags), [hideTags]);

  function toggleHide(id: string) {
    setHideTags((cur) =>
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
      hideTags,
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
            给 X/Twitter 账号打标签，并按你选择的标签隐藏帖子。
          </p>
        </div>
        <span className={`jev-pill ${hasKey ? 'ok' : 'warn'}`}>
          {hasKey ? 'Key 已保存' : '缺少 API Key'}
        </span>
      </header>

      {!hasKey && (
        <div className="jev-banner" role="status">
          密钥只存在扩展本地存储，不会写入仓库。没有 key 时不会隐藏任何帖子（fail-open）。
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
        <h2>隐藏标签 Hide tags</h2>
        <p className="jev-help">
          作者的 <code>primary_tag.choice</code> 落在这些标签上时，帖子会被 CSS
          隐藏。Jev 的 noul 只作为建议，不单独决定隐藏。
        </p>
        <div className="jev-chips">
          {tags.map((tag) => (
            <label key={tag.id} className="jev-chip">
              <input
                type="checkbox"
                checked={hideSet.has(tag.id)}
                onChange={() => toggleHide(tag.id)}
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
      </section>

      <div className="jev-actions">
        <button type="button" className="jev-btn primary" disabled={busy} onClick={() => void save()}>
          保存设置
        </button>
        <button type="button" className="jev-btn" disabled={busy} onClick={() => void onClearCache()}>
          清空缓存与日志
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
                          · 建议过滤 {entry.shouldHideCandidate.toFixed(2)}
                        </>
                      )}
                    </>
                  ) : (
                    entry.message ?? '—'
                  )}
                </p>
                {entry.tag && entry.message && <p>{entry.message}</p>}
                <time>{formatWhen(entry.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
