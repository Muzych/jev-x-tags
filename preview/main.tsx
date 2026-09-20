import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsPanel } from '../components/SettingsPanel';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import type { BlockRecord, LogEntry, Settings } from '../lib/types';
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
    handle: 'token_shill',
    tag: 'crypto',
    source: 'block',
    message: 'queued for platform block',
    at: Date.now() - 110_000,
  },
  {
    handle: 'mystery',
    source: 'error',
    message: 'API key missing',
    at: Date.now() - 180_000,
  },
];

const SAMPLE_BLOCKS: BlockRecord[] = [
  {
    handle: 'token_shill',
    tag: 'crypto',
    status: 'pending',
    confirmed: false,
    queuedAt: Date.now() - 110_000,
    updatedAt: Date.now() - 110_000,
  },
  {
    handle: 'spam_bot',
    tag: 'spam',
    status: 'blocked',
    confirmed: true,
    queuedAt: Date.now() - 400_000,
    updatedAt: Date.now() - 90_000,
  },
  {
    handle: 'ghost',
    tag: 'promo',
    status: 'failed',
    confirmed: false,
    error: 'HTTP 403 (not logged in or CSRF rejected)',
    queuedAt: Date.now() - 200_000,
    updatedAt: Date.now() - 50_000,
  },
];

function Preview() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [log, setLog] = useState<LogEntry[]>(SAMPLE_LOG);
  const [cacheSize, setCacheSize] = useState(12);
  const [blocks, setBlocks] = useState<BlockRecord[]>(SAMPLE_BLOCKS);
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
      blocks={blocks}
      blockCounts={{ pending: 1, blocking: 0, blocked: 1, failed: 1 }}
      notice={notice}
      onSave={(next) => {
        setSettings(next);
        setNotice('预览已更新（未写入浏览器扩展存储）。');
      }}
      onClearCache={() => {
        setLog([]);
        setCacheSize(0);
        setNotice('预览打标缓存已清空。');
      }}
      onBlockMatching={() => {
        setBlocks((cur) =>
          cur.map((b) =>
            b.status === 'failed'
              ? { ...b, status: 'pending', error: undefined, updatedAt: Date.now() }
              : b,
          ),
        );
        setNotice('预览：失败项已重新入队（未真正拉黑）。');
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
