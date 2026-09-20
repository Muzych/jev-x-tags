/**
 * X web block uses the logged-in viewer session.
 *
 * Verified against current extension / userscript practice (2024–2026):
 * POST same-origin `/i/api/1.1/blocks/create.json` with `user_id` or
 * `screen_name`, `ct0` as `x-csrf-token`, and the official X web client
 * public bearer (the same token the x.com JS bundle embeds — not a user
 * secret). GraphQL `BlockUser` exists but its queryId rotates with bundles,
 * so we do not hard-code one.
 */

/** Official X web client public bearer (stable, embedded in x.com frontend). */
export const X_WEB_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

export function csrfFromCookie(cookie: string): string | null {
  const match = cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function buildBlockHeaders(
  csrf: string,
  bearer = X_WEB_BEARER,
): Record<string, string> {
  return {
    authorization: `Bearer ${bearer}`,
    'x-csrf-token': csrf,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'content-type': 'application/x-www-form-urlencoded',
  };
}

export function buildBlockBody(handle: string, userId?: string): string {
  const body = new URLSearchParams();
  if (userId && /^\d+$/.test(userId)) body.set('user_id', userId);
  else body.set('screen_name', handle);
  body.set('skip_status', '1');
  return body.toString();
}

export function blockUrl(origin: string): string {
  const host = origin.includes('twitter.com')
    ? 'https://twitter.com'
    : 'https://x.com';
  return `${host}/i/api/1.1/blocks/create.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function interpretBlockResponse(
  status: number,
  json: unknown,
): { ok: boolean; confirmed: boolean; error?: string } {
  if (status === 429) {
    return { ok: false, confirmed: false, error: 'HTTP 429 rate limited' };
  }
  if (status === 401 || status === 403) {
    return {
      ok: false,
      confirmed: false,
      error: `HTTP ${status} (not logged in or CSRF rejected)`,
    };
  }
  if (status < 200 || status >= 300) {
    return { ok: false, confirmed: false, error: `HTTP ${status}` };
  }

  if (!isRecord(json)) {
    return {
      ok: false,
      confirmed: false,
      error: 'Block response was empty or not JSON — not treating as success',
    };
  }

  const screen =
    typeof json.screen_name === 'string' ? json.screen_name : undefined;
  const id =
    typeof json.id_str === 'string'
      ? json.id_str
      : typeof json.id === 'number'
        ? String(json.id)
        : undefined;
  const blocking = json.blocking === true;

  if (screen || id || blocking) {
    return { ok: true, confirmed: true };
  }

  return {
    ok: false,
    confirmed: false,
    error: 'Block response missing user identity — fail-open',
  };
}
