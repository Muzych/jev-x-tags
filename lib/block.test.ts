import { describe, expect, it } from 'vitest';
import {
  applyBlockReport,
  claimJobs,
  claimJobsForDrain,
  enqueueBlock,
  isConfirmedBlock,
  listMatchingHandles,
  shouldSkipAutoEnqueue,
  summarizeBlocks,
} from './block';
import { AUTO_RETRY_FAILED_MS, STALE_BLOCKING_MS } from './defaults';
import type { BlockRecord } from './types';

const now = 1_700_000_000_000;

function rec(patch: Partial<BlockRecord>): BlockRecord {
  return {
    handle: 'alice',
    status: 'pending',
    confirmed: false,
    queuedAt: now,
    updatedAt: now,
    ...patch,
  };
}

describe('enqueueBlock', () => {
  it('adds a pending record', () => {
    const { blocks, enqueued } = enqueueBlock(
      {},
      { handle: 'alice', tag: 'spam' },
      now,
    );
    expect(enqueued).toBe(true);
    expect(blocks.alice?.status).toBe('pending');
    expect(blocks.alice?.tag).toBe('spam');
  });

  it('does not re-queue a confirmed block', () => {
    const existing = rec({ status: 'blocked', confirmed: true });
    const { enqueued } = enqueueBlock(
      { alice: existing },
      { handle: 'alice', force: true },
      now,
    );
    expect(enqueued).toBe(false);
  });

  it('force retries a failed record', () => {
    const existing = rec({
      status: 'failed',
      error: 'nope',
      updatedAt: now - 1000,
    });
    const { enqueued, blocks } = enqueueBlock(
      { alice: existing },
      { handle: 'alice', force: true },
      now,
    );
    expect(enqueued).toBe(true);
    expect(blocks.alice?.status).toBe('pending');
    expect(blocks.alice?.confirmed).toBe(false);
  });
});

describe('shouldSkipAutoEnqueue', () => {
  it('skips confirmed, in-flight, and recently failed', () => {
    expect(shouldSkipAutoEnqueue(rec({ status: 'blocked', confirmed: true }), now)).toBe(
      true,
    );
    expect(shouldSkipAutoEnqueue(rec({ status: 'pending' }), now)).toBe(true);
    expect(
      shouldSkipAutoEnqueue(
        rec({ status: 'failed', updatedAt: now - 1000 }),
        now,
      ),
    ).toBe(true);
    expect(
      shouldSkipAutoEnqueue(
        rec({ status: 'failed', updatedAt: now - AUTO_RETRY_FAILED_MS - 1 }),
        now,
      ),
    ).toBe(false);
  });
});

describe('claimJobs', () => {
  it('marks pending jobs as blocking', () => {
    const { claimed, blocks } = claimJobs(
      { alice: rec({}), bob: rec({ handle: 'bob', queuedAt: now + 1 }) },
      now,
      1,
    );
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.handle).toBe('alice');
    expect(blocks.alice?.status).toBe('blocking');
    expect(blocks.bob?.status).toBe('pending');
  });

  it('reclaims stale blocking jobs', () => {
    const { claimed } = claimJobs(
      {
        alice: rec({
          status: 'blocking',
          updatedAt: now - STALE_BLOCKING_MS - 1,
        }),
      },
      now,
      1,
    );
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.handle).toBe('alice');
  });
});

describe('claimJobsForDrain', () => {
  it('does not claim or mutate pending jobs when auto-block is off', () => {
    const pending = rec({});
    const { claimed, blocks } = claimJobsForDrain(
      { alice: pending },
      false,
      now,
      1,
    );
    expect(claimed).toEqual([]);
    expect(blocks.alice).toEqual(pending);
    expect(blocks.alice?.status).toBe('pending');
  });

  it('claims pending jobs when auto-block is on', () => {
    const { claimed, blocks } = claimJobsForDrain(
      { alice: rec({}) },
      true,
      now,
      1,
    );
    expect(claimed).toHaveLength(1);
    expect(blocks.alice?.status).toBe('blocking');
  });
});

describe('applyBlockReport', () => {
  it('confirms only on explicit success', () => {
    const ok = applyBlockReport(rec({}), { ok: true, confirmed: true }, now);
    expect(ok.status).toBe('blocked');
    expect(ok.confirmed).toBe(true);
    expect(isConfirmedBlock(ok)).toBe(true);

    const fail = applyBlockReport(
      rec({}),
      { ok: false, error: 'HTTP 403' },
      now,
    );
    expect(fail.status).toBe('failed');
    expect(fail.confirmed).toBe(false);
    expect(fail.error).toBe('HTTP 403');
  });

  it('treats ok-without-confirmation as failed (fail-open)', () => {
    const result = applyBlockReport(
      rec({}),
      { ok: true, confirmed: false, error: 'empty body' },
      now,
    );
    expect(result.status).toBe('failed');
    expect(result.confirmed).toBe(false);
  });
});

describe('summarize + match list', () => {
  it('counts statuses and lists cache matches', () => {
    expect(
      summarizeBlocks({
        a: rec({ handle: 'a', status: 'pending' }),
        b: rec({ handle: 'b', status: 'blocked', confirmed: true }),
        c: rec({ handle: 'c', status: 'failed' }),
      }),
    ).toEqual({ pending: 1, blocking: 0, blocked: 1, failed: 1 });

    expect(
      listMatchingHandles(
        {
          alice: { tag: 'spam', shouldHideCandidate: 1, taggedAt: now },
          bob: { tag: 'tech', shouldHideCandidate: 0, taggedAt: now },
        },
        ['spam'],
      ),
    ).toEqual(['alice']);
  });
});
