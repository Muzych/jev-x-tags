import { describe, expect, it } from 'vitest';
import {
  attachTagBadge,
  badgeCaption,
  badgeModel,
  badgeTooltip,
  paintNameHosts,
} from './badge';
import { findNameHosts, handleFromUserName } from './extract';
import type { TagResult } from './types';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

const RESULT: TagResult = {
  handle: 'alice_dev',
  tag: 'news',
  shouldHideCandidate: 0.1,
  taggedAt: 1,
  cached: false,
};

describe('badgeCaption / tooltip', () => {
  it('always shows the tag text even when auto-block is off', () => {
    expect(badgeCaption('news')).toBe('news');
    expect(
      badgeTooltip({
        tag: 'news',
        wouldBlock: true,
        autoBlockEnabled: false,
      }),
    ).toContain('Jev: news');
    expect(
      badgeTooltip({
        tag: 'news',
        wouldBlock: true,
        autoBlockEnabled: false,
      }),
    ).toMatch(/auto-block off/i);
  });
});

describe('attachTagBadge', () => {
  it('inserts a visible badge next to tweet User-Name, not inside a clipped inner row', () => {
    const root = mount(`
      <article data-testid="tweet">
        <div class="header" style="display:flex">
          <div data-testid="User-Name" style="overflow:hidden">
            <a href="/alice_dev"><span>Alice Dev</span></a>
            <a href="/alice_dev"><span>@alice_dev</span></a>
          </div>
        </div>
      </article>
    `);
    const host = root.querySelector<HTMLElement>('[data-testid="User-Name"]')!;
    const badge = attachTagBadge(host, {
      handle: 'alice_dev',
      tag: 'news',
      title: 'Jev: news',
      wouldBlock: false,
    });
    expect(badge.textContent).toBe('news');
    expect(badge.title).toBe('Jev: news');
    expect(host.nextElementSibling).toBe(badge);
    expect(host.contains(badge)).toBe(false);
    expect(getComputedStyle(badge).display).not.toBe('none');
  });

  it('paints profile UserName hosts (not only tweet User-Name)', () => {
    const root = mount(`
      <div data-testid="UserName">
        <a href="/alice_dev"><span>Alice Dev</span></a>
        <a href="/alice_dev"><span>@alice_dev</span></a>
      </div>
    `);
    const host = findNameHosts(root)[0]!;
    expect(handleFromUserName(host)).toBe('alice_dev');
    attachTagBadge(host, {
      handle: 'alice_dev',
      tag: 'news',
      title: 'Jev: news',
      wouldBlock: false,
    });
    expect(host.nextElementSibling?.className).toBe('jev-tag-badge');
  });

  it('does not duplicate badges on repaint', () => {
    const root = mount(
      '<div data-testid="User-Name"><a href="/alice_dev">@alice_dev</a></div>',
    );
    const host = root.querySelector<HTMLElement>('[data-testid="User-Name"]')!;
    const model = {
      handle: 'alice_dev',
      tag: 'news',
      title: 'Jev: news',
      wouldBlock: false,
    };
    attachTagBadge(host, model);
    attachTagBadge(host, { ...model, tag: 'tech', title: 'Jev: tech' });
    expect(root.querySelectorAll('.jev-tag-badge')).toHaveLength(1);
    expect(host.nextElementSibling?.textContent).toBe('tech');
  });

  it('does not rebuild the node when the tag is unchanged', () => {
    const root = mount(
      '<div data-testid="User-Name"><a href="/alice_dev">@alice_dev</a></div>',
    );
    const host = root.querySelector<HTMLElement>('[data-testid="User-Name"]')!;
    const model = {
      handle: 'alice_dev',
      tag: 'news',
      title: 'Jev: news',
      wouldBlock: false,
    };
    const first = attachTagBadge(host, model);
    const text = first.firstChild;
    const second = attachTagBadge(host, model);
    expect(second).toBe(first);
    expect(second.firstChild).toBe(text);
  });
});

describe('paintNameHosts', () => {
  it('paints every matching host without requiring auto-block', () => {
    const root = mount(`
      <div>
        <article data-testid="tweet">
          <div data-testid="User-Name">
            <a href="/alice_dev"><span>@alice_dev</span></a>
          </div>
        </article>
        <div data-testid="UserName">
          <a href="/alice_dev"><span>@alice_dev</span></a>
        </div>
        <article data-testid="tweet">
          <div data-testid="User-Names">
            <a href="/bob"><span>@bob</span></a>
          </div>
        </article>
      </div>
    `);
    const tags = new Map<string, TagResult>([
      ['alice_dev', RESULT],
      [
        'bob',
        { ...RESULT, handle: 'bob', tag: 'other', cached: true },
      ],
    ]);
    const n = paintNameHosts(tags, {
      blockTags: ['news'],
      autoBlockEnabled: false,
      recordFor: () => undefined,
      root,
    });
    expect(n).toBe(3);
    const badges = [...root.querySelectorAll('.jev-tag-badge')];
    expect(badges.map((b) => b.textContent)).toEqual(['news', 'news', 'other']);
    expect(
      badgeModel(RESULT, { blockTags: ['news'], autoBlockEnabled: false })
        .wouldBlock,
    ).toBe(true);
  });
});
