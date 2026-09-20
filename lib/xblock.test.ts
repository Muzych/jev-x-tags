import { describe, expect, it } from 'vitest';
import {
  blockUrl,
  buildBlockBody,
  buildBlockHeaders,
  csrfFromCookie,
  interpretBlockResponse,
} from './xblock';

describe('csrfFromCookie', () => {
  it('reads ct0', () => {
    expect(csrfFromCookie('guest_id=x; ct0=abc123; twid=u%3D1')).toBe('abc123');
    expect(csrfFromCookie('nope=1')).toBeNull();
  });
});

describe('buildBlockBody', () => {
  it('prefers numeric user_id', () => {
    expect(buildBlockBody('alice', '12345')).toBe(
      'user_id=12345&skip_status=1',
    );
  });

  it('falls back to screen_name', () => {
    expect(buildBlockBody('alice')).toBe('screen_name=alice&skip_status=1');
    expect(buildBlockBody('alice', 'not-a-id')).toBe(
      'screen_name=alice&skip_status=1',
    );
  });
});

describe('buildBlockHeaders + url', () => {
  it('sends session CSRF headers', () => {
    const headers = buildBlockHeaders('tok');
    expect(headers['x-csrf-token']).toBe('tok');
    expect(headers['x-twitter-auth-type']).toBe('OAuth2Session');
    expect(headers.authorization?.startsWith('Bearer ')).toBe(true);
    expect(blockUrl('https://x.com/home')).toContain('/i/api/1.1/blocks/create.json');
  });
});

describe('interpretBlockResponse', () => {
  it('confirms a 200 user object', () => {
    expect(
      interpretBlockResponse(200, {
        id_str: '1',
        screen_name: 'alice',
        blocking: true,
      }),
    ).toEqual({ ok: true, confirmed: true });
  });

  it('fail-opens on 200 without identity', () => {
    const result = interpretBlockResponse(200, { data: {} });
    expect(result.ok).toBe(false);
    expect(result.confirmed).toBe(false);
  });

  it('fail-opens on auth / rate-limit errors', () => {
    expect(interpretBlockResponse(403, {}).confirmed).toBe(false);
    expect(interpretBlockResponse(429, {}).error).toMatch(/429/);
    expect(interpretBlockResponse(200, null).confirmed).toBe(false);
  });
});
