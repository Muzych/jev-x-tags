/** Trailing coalescer: many trigger() calls become one fn() after waitMs. */
export function createCoalescer(
  fn: () => void,
  waitMs: number,
  schedule: (cb: () => void, ms: number) => number = (cb, ms) =>
    setTimeout(cb, ms) as unknown as number,
  cancelTimer: (id: number) => void = (id) => clearTimeout(id),
): { trigger: () => void; cancel: () => void } {
  let id: number | null = null;
  return {
    trigger() {
      if (id != null) return;
      id = schedule(() => {
        id = null;
        fn();
      }, waitMs);
    },
    cancel() {
      if (id == null) return;
      cancelTimer(id);
      id = null;
    },
  };
}
