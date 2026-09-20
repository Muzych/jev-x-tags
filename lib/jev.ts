import {
  JEV_ENDPOINT,
  JEV_MODEL,
  PRIMARY_TAG_INSTRUCTIONS,
  SHOULD_HIDE_CRITERIA,
  SHOULD_HIDE_INSTRUCTIONS,
} from './defaults';
import type { AccountState, JevResponseBody, TagDefinition } from './types';

export interface JevRequestBody {
  model: typeof JEV_MODEL;
  state: AccountState;
  questions: {
    primary_tag: {
      type: 'choice';
      instructions: string;
      criteria: Record<string, string | null>;
    };
    should_hide_candidate: {
      type: 'noul';
      instructions: string;
      criteria: { true: string; false: string };
    };
  };
}

export interface ParsedJev {
  tag: string;
  confidence?: number;
  shouldHideCandidate: number;
}

/** Jev Choice criteria: every tag id → description; `other` is always null. */
export function buildCriteria(
  tags: TagDefinition[],
): Record<string, string | null> {
  const criteria: Record<string, string | null> = {};
  for (const tag of tags) {
    const id = tag.id.trim();
    if (!id) continue;
    criteria[id] = id === 'other' ? null : tag.description;
  }
  if (!('other' in criteria)) criteria.other = null;
  return criteria;
}

export function buildJevRequest(
  state: AccountState,
  tags: TagDefinition[],
): JevRequestBody {
  return {
    model: JEV_MODEL,
    state: {
      handle: state.handle,
      displayName: state.displayName,
      bio: state.bio,
      recentText: state.recentText,
    },
    questions: {
      primary_tag: {
        type: 'choice',
        instructions: PRIMARY_TAG_INSTRUCTIONS,
        criteria: buildCriteria(tags),
      },
      should_hide_candidate: {
        type: 'noul',
        instructions: SHOULD_HIDE_INSTRUCTIONS,
        criteria: { ...SHOULD_HIDE_CRITERIA },
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJevResponse(json: unknown): ParsedJev {
  if (!isRecord(json)) throw new Error('Jev response is not an object');
  const answers = isRecord(json.answers) ? json.answers : null;
  if (!answers) throw new Error('Jev response missing answers');

  const primary = isRecord(answers.primary_tag) ? answers.primary_tag : null;
  const choice = primary && typeof primary.choice === 'string' ? primary.choice : '';
  if (!choice) throw new Error('Jev response missing primary_tag.choice');

  const confidence =
    primary && typeof primary.confidence === 'number'
      ? primary.confidence
      : undefined;

  const noulBlock = isRecord(answers.should_hide_candidate)
    ? answers.should_hide_candidate
    : null;
  const noul =
    noulBlock && typeof noulBlock.noul === 'number' ? noulBlock.noul : 0;

  return {
    tag: choice,
    confidence,
    shouldHideCandidate: noul,
  };
}

export function jevHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export { JEV_ENDPOINT };

export type { JevResponseBody };
