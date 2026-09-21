import { describe, expect, it } from 'vitest';
import { createCoalescer } from './coalesce';

describe('createCoalescer', () => {
  it('runs fn once for a burst of triggers', () => {
    let calls = 0;
    const queued: Array<{ cb: () => void; ms: number }> = [];
    const c = createCoalescer(
      () => {
        calls += 1;
      },
      250,
      (cb, ms) => {
        queued.push({ cb, ms });
        return queued.length;
      },
      () => undefined,
    );
    c.trigger();
    c.trigger();
    c.trigger();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.ms).toBe(250);
    queued[0]?.cb();
    expect(calls).toBe(1);
    c.trigger();
    expect(queued).toHaveLength(2);
  });

  it('cancel prevents the pending run', () => {
    let calls = 0;
    const queued: Array<() => void> = [];
    const c = createCoalescer(
      () => {
        calls += 1;
      },
      250,
      (cb) => {
        queued.push(cb);
        return queued.length;
      },
      () => queued.pop(),
    );
    c.trigger();
    c.cancel();
    expect(calls).toBe(0);
    c.trigger();
    queued.at(-1)?.();
    expect(calls).toBe(1);
  });
});
