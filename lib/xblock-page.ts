import {
  blockUrl,
  buildBlockBody,
  buildBlockHeaders,
  csrfFromCookie,
  interpretBlockResponse,
} from './xblock';

export interface PageBlockResult {
  ok: boolean;
  confirmed: boolean;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function blockViaSession(
  handle: string,
  userId?: string,
): Promise<PageBlockResult> {
  const csrf = csrfFromCookie(document.cookie);
  if (!csrf) {
    return {
      ok: false,
      confirmed: false,
      error: 'Missing ct0 CSRF — are you logged into X?',
    };
  }

  try {
    const res = await fetch(blockUrl(location.origin), {
      method: 'POST',
      credentials: 'include',
      headers: buildBlockHeaders(csrf),
      body: buildBlockBody(handle, userId),
    });
    const json: unknown = await res.json().catch(() => null);
    return interpretBlockResponse(res.status, json);
  } catch (err) {
    return {
      ok: false,
      confirmed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function menuLooksLikeBlock(text: string): boolean {
  return /block|屏蔽|封鎖|ブロック|차단/i.test(text) && !/unblock|取消屏蔽/i.test(text);
}

/** Last resort: click the native caret → Block → confirm sheet. */
export async function blockViaUi(handle: string): Promise<PageBlockResult> {
  const articles = [
    ...document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]'),
  ];
  let scope: HTMLElement | null = null;
  for (const article of articles) {
    const at = article.querySelector('[data-testid="User-Name"]');
    if (at?.textContent?.toLowerCase().includes(`@${handle}`)) {
      scope = article;
      break;
    }
  }

  const caret =
    scope?.querySelector<HTMLElement>('button[data-testid="caret"]') ??
    document.querySelector<HTMLElement>('[data-testid="userActions"]') ??
    document.querySelector<HTMLElement>('button[data-testid="caret"]');

  if (!caret) {
    return {
      ok: false,
      confirmed: false,
      error: 'UI fallback: no overflow/user-actions control',
    };
  }

  caret.click();
  await sleep(280);

  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (el) => menuLooksLikeBlock(el.textContent ?? ''),
  );
  if (!item) {
    document.body.click();
    return {
      ok: false,
      confirmed: false,
      error: 'UI fallback: Block menu item not found',
    };
  }
  item.click();
  await sleep(280);

  const confirm = document.querySelector<HTMLElement>(
    '[data-testid="confirmationSheetConfirm"]',
  );
  if (!confirm) {
    return {
      ok: false,
      confirmed: false,
      error: 'UI fallback: confirm dialog missing',
    };
  }
  confirm.click();
  await sleep(400);
  return { ok: true, confirmed: true };
}

export async function blockOnPage(
  handle: string,
  userId?: string,
): Promise<PageBlockResult> {
  const session = await blockViaSession(handle, userId);
  if (session.ok && session.confirmed) return session;
  const ui = await blockViaUi(handle);
  if (ui.ok && ui.confirmed) return ui;
  return {
    ok: false,
    confirmed: false,
    error: [session.error, ui.error].filter(Boolean).join(' · '),
  };
}
