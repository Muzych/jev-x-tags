/** Block the account when the assigned tag is in the user's block set. Noul is a suggestion. */
export function shouldBlockByTag(
  tag: string | undefined,
  blockTags: readonly string[],
): boolean {
  if (!tag) return false;
  const normalized = tag.trim().toLowerCase();
  return blockTags.some((t) => t.trim().toLowerCase() === normalized);
}
