# Jev X Tags

用 [TypeSafe Jev](https://typesafe.ai)（System One）给 X/Twitter 账号打标签，并按你选择的标签从时间线隐藏帖子。

Tag X/Twitter accounts with TypeSafe Jev and hide posts whose author tag is in your hide set.

这是一个 **Chromium Manifest V3** 扩展，基于 [WXT](https://wxt.dev) + TypeScript + React。只刮取公开时间线 DOM，不调用 Twitter 私有 API。

## 功能 Features

- 在 `https://x.com` / `https://twitter.com` 时间线观察每条可见帖子
- 从 DOM 读取作者 handle、显示名、简介（如有）、当前帖子文本
- 帖子进入视口后再打标（IntersectionObserver + debounce）；后台 service worker 串行调用 Jev，避免刷爆 API
- `primary_tag.choice` 作为账号标签；用户勾选的 hide tags 决定是否隐藏
- `should_hide_candidate`（noul）只作为 UI 建议，**不单独隐藏**
- 按 handle 缓存到 `chrome.storage.local`，带 TTL
- 打标失败或缺少 key 时 **fail-open**（不隐藏）
- API key 只存在扩展存储里，仓库不包含密钥

## 安装与开发 Install

需要 Node 20+ 和 [pnpm](https://pnpm.io)。

```bash
pnpm install
pnpm dev
```

`pnpm dev` 会编译到 `.output/chrome-mv3`。在 Chrome / Edge / Brave：

1. 打开 `chrome://extensions`
2. 打开 **开发者模式 Developer mode**
3. **加载已解压的扩展 Load unpacked**，选仓库里的 `.output/chrome-mv3`
4. 点工具栏图标，粘贴 TypeSafe API key（[console.typesafe.ai](https://console.typesafe.ai)），保存
5. 按需编辑标签词表、勾选要隐藏的标签（默认：`spam` / `promo` / `crypto`）
6. 打开 x.com 主页时间线并滚动。作者旁会出现标签；匹配 hide set 的帖子会被 CSS 隐藏（仍留在 DOM，以免打断无限滚动）

生产构建：

```bash
pnpm build
```

产物同样在 `.output/chrome-mv3`。

## 选项页 Options

- **API Key**：Bearer token，仅本地存储
- **Hide tags**：与作者标签求交则隐藏
- **Tag list**：每项的 description 会作为 Jev Choice `criteria`；`other` 在请求里固定为 `null`
- **TTL**：默认 168 小时
- **清空缓存**：丢掉 handle → tag 缓存和日志
- **日志**：最近打标结果、缓存命中、错误；noul「建议过滤」分数会显示在这里

完整选项页：右键扩展图标 → 选项，或弹窗里的「打开完整选项」。

## 架构 Architecture

```
内容脚本 Content script (x.com)
  MutationObserver + IntersectionObserver
        │  chrome.runtime.sendMessage({ type: "TAG_ACCOUNT" })
        ▼
后台 Service worker
  读 chrome.storage.local 缓存
  未命中则 POST https://api.typesafe.ai/v1/systemone
        │
        ▼
内容脚本按 hide tags 给 article / cellInnerDiv 加 .jev-hidden
```

Jev 请求体（字段固定）：

```json
{
  "model": "jev-latest",
  "state": { "handle": "", "displayName": "", "bio": "", "recentText": "" },
  "questions": {
    "primary_tag": {
      "type": "choice",
      "instructions": "Pick the best tag for this X/Twitter account based on the state.",
      "criteria": { "spam": "...", "other": null }
    },
    "should_hide_candidate": {
      "type": "noul",
      "instructions": "Is this account the kind the user would typically want filtered (spam, ragebait, crypto promo, etc.)?",
      "criteria": { "true": "...", "false": "..." }
    }
  }
}
```

权限：`storage`；host：`x.com`、`twitter.com`、`api.typesafe.ai`。

## 测试 Tests

```bash
pnpm test
pnpm compile
pnpm build
```

单测覆盖：DOM 抽取、Jev 请求/响应、缓存 TTL、按标签隐藏。没有连真实 TypeSafe 账号的 e2e。

## 预览选项 UI Preview

不装扩展也能看选项页：

```bash
pnpm preview
```

打开 http://127.0.0.1:43173 （内存状态，不会写入扩展存储）。

## 安全 Secrets

- 不要把 key 写进代码、README 或 git
- 密钥只通过弹窗/选项页写入 `chrome.storage.local`
- 内容脚本拿不到 key；只有 service worker 带 `Authorization` 调 Jev
