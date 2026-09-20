import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsPanel } from '../components/SettingsPanel';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import type { LogEntry, Settings } from '../lib/types';
import '../components/settings.css';

const SAMPLE_LOG: LogEntry[] = [
  {
    handle: 'alice_dev',
    tag: 'tech',
    confidence: 0.91,
    shouldHideCandidate: 0.08,
    source: 'api',
    at: Date.now() - 60_000,
  },
  {
    handle: 'token_shill',
    tag: 'crypto',
    confidence: 0.87,
    shouldHideCandidate: 0.93,
    source: 'cache',
    at: Date.now() - 120_000,
  },
  {
    handle: 'mystery',
    source: 'error',
    message: 'API key missing',
    at: Date.now() - 180_000,
  },
];

function Preview() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [log, setLog] = useState<LogEntry[]>(SAMPLE_LOG);
  const [cacheSize, setCacheSize] = useState(12);
  const [notice, setNotice] = useState<string | null>(
    '这是选项页预览（内存状态）。真正的密钥只保存在扩展 chrome.storage.local。',
  );

  return (
    <SettingsPanel
      variant="preview"
      settings={settings}
      log={log}
      cacheSize={cacheSize}
      hasKey={Boolean(settings.apiKey)}
      notice={notice}
      onSave={(next) => {
        setSettings(next);
        setNotice('预览已更新（未写入浏览器扩展存储）。');
      }}
      onClearCache={() => {
        setLog([]);
        setCacheSize(0);
        setNotice('预览缓存已清空。');
      }}
    />
  );
}

document.documentElement.style.background = '#0b0f14';
document.body.style.margin = '0';
document.body.style.minHeight = '100vh';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
);
