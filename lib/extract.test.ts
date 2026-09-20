import { describe, expect, it } from 'vitest';
import {
  extractAuthor,
  extractProfileAccount,
  extractUserId,
  findTweetArticles,
  mergeRecentText,
  viewerHandle,
} from './extract';
import { handleFromPath, isLikelyHandle, normalizeHandle } from './handles';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

const TWEET = `
<article data-testid="tweet">
  <div data-testid="User-Name">
    <a href="/alice_dev"><span>Alice Dev</span></a>
    <a href="/alice_dev"><span>@alice_dev</span></a>
  </div>
  <div data-testid="tweetText">just shipped a rust parser</div>
  <div data-testid="UserDescription">compilers and cats</div>
  <div data-testid="1234567890-follow"></div>
</article>
`;

describe('handles', () => {
  it('normalizes @Handle/path', () => {
    expect(normalizeHandle('@Bob/status/1')).toBe('bob');
    expect(isLikelyHandle('home')).toBe(false);
    expect(isLikelyHandle('alice_dev')).toBe(true);
    expect(handleFromPath('/carol/status/99')).toBe('carol');
    expect(handleFromPath('/explore')).toBeNull();
  });
});

describe('extractAuthor', () => {
  it('reads handle, display name, bio, tweet text, and user id', () => {
    const root = mount(TWEET);
    const articles = findTweetArticles(root);
    expect(articles).toHaveLength(1);
    const article = articles[0];
    expect(article).toBeDefined();
    expect(extractAuthor(article!)).toEqual({
      handle: 'alice_dev',
      displayName: 'Alice Dev',
      bio: 'compilers and cats',
      recentText: 'just shipped a rust parser',
      userId: '1234567890',
    });
  });

  it('returns null when no author handle is present', () => {
    const root = mount('<article data-testid="tweet"><p>ad</p></article>');
    expect(extractAuthor(root.querySelector('article')!)).toBeNull();
  });
});

describe('extractUserId', () => {
  it('reads follow testid and /i/user/ links', () => {
    const follow = mount('<div data-testid="99-unfollow"></div>');
    expect(extractUserId(follow)).toBe('99');
    const link = mount('<a href="/i/user/777"></a>');
    expect(extractUserId(link)).toBe('777');
  });
});

describe('extractProfileAccount', () => {
  it('reads profile handle, bio, and recent posts', () => {
    const root = mount(`
      <div>
        <div data-testid="UserName">
          <a href="/alice_dev"><span>Alice Dev</span></a>
          <a href="/alice_dev"><span>@alice_dev</span></a>
        </div>
        <div data-testid="UserDescription">compilers and cats</div>
        ${TWEET}
      </div>
    `);
    expect(extractProfileAccount(root, '/alice_dev')).toEqual({
      handle: 'alice_dev',
      displayName: 'Alice Dev',
      bio: 'compilers and cats',
      recentText: 'just shipped a rust parser',
      userId: '1234567890',
    });
    expect(extractProfileAccount(root, '/alice_dev/status/1')).toBeNull();
  });
});

describe('mergeRecentText + viewerHandle', () => {
  it('dedupes recent comments', () => {
    expect(mergeRecentText('hello', 'hello | world')).toBe('hello | world');
  });

  it('reads the sidebar profile link', () => {
    const root = mount(
      '<a data-testid="AppTabBar_Profile_Link" href="/me_user"></a>',
    );
    expect(viewerHandle(root)).toBe('me_user');
  });
});
