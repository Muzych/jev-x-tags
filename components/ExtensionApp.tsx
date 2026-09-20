import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { clearCache, getSettings, getStatus, setSettings } from '@/lib/messaging';
import type { LogEntry, Settings } from '@/lib/types';
import { SettingsPanel } from './SettingsPanel';

export function ExtensionApp({ variant }: { variant: 'popup' | 'options' }) {
  const [settings, setLocal] = useState<Settings>(DEFAULT_SETTINGS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [s, st] = await Promise.all([getSettings(), getStatus()]);
    if (s.ok) setLocal(s.settings);
    if (st.ok) {
      setLog(st.log);
      setCacheSize(st.cacheSize);
      setHasKey(st.hasKey);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      setNotice('无法读取扩展存储。请确认已作为 unpacked 扩展加载。');
      setReady(true);
    });
  }, [refresh]);

  if (!ready) {
    return (
      <div className="jev-app">
        <p className="jev-empty">加载设置…</p>
      </div>
    );
  }

  return (
    <SettingsPanel
      key={`${settings.apiKey}:${settings.tags.length}:${cacheSize}`}
      variant={variant}
      settings={settings}
      log={log}
      cacheSize={cacheSize}
      hasKey={hasKey}
      busy={busy}
      notice={notice}
      onSave={async (next) => {
        setBusy(true);
        setNotice(null);
        try {
          const res = await setSettings(next);
          if (!res.ok) throw new Error(res.error);
          setNotice('已保存。新标签会在缓存过期或清空后生效。');
          await refresh();
        } catch (err) {
          setNotice(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      }}
      onClearCache={async () => {
        setBusy(true);
        try {
          await clearCache();
          setNotice('缓存和日志已清空。');
          await refresh();
        } finally {
          setBusy(false);
        }
      }}
      onOpenOptions={
        variant === 'popup'
          ? () => {
              browser.runtime.openOptionsPage();
            }
          : undefined
      }
    />
  );
}
