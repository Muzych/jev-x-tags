import { findNameHosts, handleFromUserName } from './extract';
import { shouldBlockByTag } from './match';
import type { BlockRecord, TagResult } from './types';

export const BADGE_CLASS = 'jev-tag-badge';

export interface BadgeModel {
  handle: string;
  tag: string;
  title: string;
  wouldBlock: boolean;
  status?: string;
}

/** Always the raw tag — badges stay visible in tagging-only mode. */
export function badgeCaption(tag: string): string {
  return tag;
}

export function badgeTooltip(input: {
  tag: string;
  cached?: boolean;
  wouldBlock?: boolean;
  autoBlockEnabled?: boolean;
  status?: BlockRecord['status'];
  error?: string;
}): string {
  const bits = [`Jev: ${input.tag}`];
  if (input.error) bits.push(input.error);
  else if (input.status === 'blocked') bits.push('blocked');
  else if (input.status === 'failed') bits.push('block failed');
  else if (input.status === 'pending' || input.status === 'blocking') {
    bits.push('queued to block');
  } else if (input.wouldBlock && !input.autoBlockEnabled) {
    bits.push('matches a block tag (auto-block off)');
  } else if (input.cached) {
    bits.push('cached');
  }
  return bits.join(' · ');
}

export function badgeModel(
  result: TagResult,
  opts: {
    blockTags: readonly string[];
    autoBlockEnabled: boolean;
    record?: BlockRecord;
  },
): BadgeModel {
  const wouldBlock = shouldBlockByTag(result.tag, opts.blockTags);
  return {
    handle: result.handle,
    tag: result.tag,
    wouldBlock,
    status: opts.record?.status,
    title: badgeTooltip({
      tag: result.tag,
      cached: result.cached,
      wouldBlock,
      autoBlockEnabled: opts.autoBlockEnabled,
      status: opts.record?.status,
      error: opts.record?.error,
    }),
  };
}

function existingBadge(host: HTMLElement): HTMLElement | null {
  const next = host.nextElementSibling;
  if (next instanceof HTMLElement && next.classList.contains(BADGE_CLASS)) {
    return next;
  }
  return host.querySelector<HTMLElement>(`.${BADGE_CLASS}`);
}

export function badgeIsCurrent(
  badge: HTMLElement,
  host: HTMLElement,
  model: BadgeModel,
): boolean {
  if (host.nextElementSibling !== badge) return false;
  return (
    badge.textContent === badgeCaption(model.tag) &&
    badge.title === model.title &&
    badge.dataset.jevTag === model.tag &&
    badge.dataset.jevHandle === model.handle &&
    (badge.dataset.jevWouldBlock === '1') === Boolean(model.wouldBlock) &&
    (badge.dataset.jevStatus || undefined) === (model.status || undefined)
  );
}

/**
 * Place the badge as a sibling of the name host so X's overflow:hidden
 * on inner handle rows cannot clip it. Visible with auto-block off.
 * No-ops when the existing chip already matches (cheap on timeline scans).
 */
export function attachTagBadge(host: HTMLElement, model: BadgeModel): HTMLElement {
  let badge = existingBadge(host);
  if (badge && badgeIsCurrent(badge, host, model)) return badge;

  if (!badge) {
    badge = host.ownerDocument.createElement('span');
    badge.className = BADGE_CLASS;
  }
  const caption = badgeCaption(model.tag);
  if (badge.textContent !== caption) badge.textContent = caption;
  if (badge.title !== model.title) badge.title = model.title;
  if (badge.dataset.jevTag !== model.tag) badge.dataset.jevTag = model.tag;
  if (badge.dataset.jevHandle !== model.handle) {
    badge.dataset.jevHandle = model.handle;
  }
  if (model.wouldBlock) badge.dataset.jevWouldBlock = '1';
  else delete badge.dataset.jevWouldBlock;
  if (model.status) badge.dataset.jevStatus = model.status;
  else delete badge.dataset.jevStatus;

  if (host.nextElementSibling !== badge) host.after(badge);
  return badge;
}

export function paintNameHosts(
  tags: Map<string, TagResult>,
  opts: {
    blockTags: readonly string[];
    autoBlockEnabled: boolean;
    recordFor: (handle: string) => BlockRecord | undefined;
    root?: ParentNode;
  },
): number {
  let painted = 0;
  for (const host of findNameHosts(opts.root ?? document)) {
    const handle = handleFromUserName(host);
    if (!handle) continue;
    const result = tags.get(handle);
    if (!result) continue;
    attachTagBadge(
      host,
      badgeModel(result, {
        blockTags: opts.blockTags,
        autoBlockEnabled: opts.autoBlockEnabled,
        record: opts.recordFor(handle),
      }),
    );
    painted += 1;
  }
  return painted;
}
