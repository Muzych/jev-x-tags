import { describe, expect, it } from 'vitest';
import { extractAuthor, findTweetArticles } from './extract';
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
  it('reads handle, display name, bio, and tweet text from the public DOM', () => {
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
    });
  });

  it('returns null when no author handle is present', () => {
    const root = mount('<article data-testid="tweet"><p>ad</p></article>');
    expect(extractAuthor(root.querySelector('article')!)).toBeNull();
  });
});
