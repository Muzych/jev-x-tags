import { describe, expect, it } from 'vitest';
import { DEFAULT_TAGS } from './defaults';
import { buildCriteria, buildJevRequest, parseJevResponse } from './jev';

describe('buildCriteria', () => {
  it('maps tag descriptions and forces other=null', () => {
    const criteria = buildCriteria(DEFAULT_TAGS);
    expect(criteria.spam).toContain('Scam');
    expect(criteria.other).toBeNull();
  });

  it('adds other:null even if the user deleted that row', () => {
    const criteria = buildCriteria([{ id: 'news', description: 'News' }]);
    expect(criteria.other).toBeNull();
    expect(criteria.news).toBe('News');
  });
});

describe('buildJevRequest', () => {
  it('matches the System One contract', () => {
    const body = buildJevRequest(
      {
        handle: 'alice',
        displayName: 'Alice',
        bio: 'builds compilers',
        recentText: 'shipped a parser',
      },
      DEFAULT_TAGS,
    );

    expect(body.model).toBe('jev-latest');
    expect(body.state.handle).toBe('alice');
    expect(body.questions.primary_tag.type).toBe('choice');
    expect(body.questions.primary_tag.criteria.other).toBeNull();
    expect(body.questions.should_hide_candidate.type).toBe('noul');
    expect(body.questions.should_hide_candidate.criteria.true).toBeTruthy();
    expect(body.questions.should_hide_candidate.criteria.false).toBeTruthy();
  });
});

describe('parseJevResponse', () => {
  it('reads primary_tag.choice and noul', () => {
    const parsed = parseJevResponse({
      answers: {
        primary_tag: { choice: 'tech', confidence: 0.91 },
        should_hide_candidate: { noul: 0.12 },
      },
    });
    expect(parsed).toEqual({
      tag: 'tech',
      confidence: 0.91,
      shouldHideCandidate: 0.12,
    });
  });

  it('throws when choice is missing (fail-open upstream)', () => {
    expect(() => parseJevResponse({ answers: {} })).toThrow(/primary_tag/);
  });
});
