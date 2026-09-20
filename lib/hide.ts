/** Hide only when the assigned tag is in the user's hide set. Noul is a suggestion. */
export function shouldHideByTag(
  tag: string | undefined,
  hideTags: readonly string[],
): boolean {
  if (!tag) return false;
  const normalized = tag.trim().toLowerCase();
  return hideTags.some((t) => t.trim().toLowerCase() === normalized);
}

export function hideTarget(el: Element): HTMLElement {
  const cell = el.closest('[data-testid="cellInnerDiv"]');
  return (cell instanceof HTMLElement ? cell : el) as HTMLElement;
}

export function applyHidden(el: Element, hidden: boolean): void {
  const target = hideTarget(el);
  target.classList.toggle('jev-hidden', hidden);
  if (hidden) target.setAttribute('data-jev-hidden', '1');
  else target.removeAttribute('data-jev-hidden');
}
