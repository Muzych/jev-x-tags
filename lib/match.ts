/** Tag matches the user's auto-block set. Noul is a suggestion only. */
export function shouldBlockByTag(
  tag: string | undefined,
  blockTags: readonly string[],
): boolean {
  if (!tag) return false;
  const normalized = tag.trim().toLowerCase();
  return blockTags.some((t) => t.trim().toLowerCase() === normalized);
}

/** Enqueue only when the safety switch is on and the tag is in the block set. */
export function shouldEnqueueBlock(
  tag: string | undefined,
  blockTags: readonly string[],
  autoBlockEnabled: boolean,
): boolean {
  return autoBlockEnabled && shouldBlockByTag(tag, blockTags);
}
