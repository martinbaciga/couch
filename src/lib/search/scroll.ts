/**
 * Scroll offset that brings the active row inside the visible list.
 * A row already in view keeps the current offset.
 */
export function scrollTopForOption(
  scrollTop: number,
  containerTop: number,
  containerBottom: number,
  optionTop: number,
  optionBottom: number,
): number {
  if (optionTop < containerTop) {
    return scrollTop - (containerTop - optionTop);
  }
  if (optionBottom > containerBottom) {
    return scrollTop + (optionBottom - containerBottom);
  }
  return scrollTop;
}

/**
 * Same as {@link scrollTopForOption}, and also reveals the heading above
 * the first row when that heading and the row both fit.
 */
export function scrollTopForFirstOption(
  scrollTop: number,
  containerTop: number,
  containerBottom: number,
  optionTop: number,
  optionBottom: number,
  leadTop: number,
): number {
  const row = scrollTopForOption(
    scrollTop,
    containerTop,
    containerBottom,
    optionTop,
    optionBottom,
  );
  const withLead = scrollTopForOption(
    row,
    containerTop,
    containerBottom,
    leadTop,
    optionBottom,
  );
  const shift = withLead - scrollTop;
  const nextLeadTop = leadTop - shift;
  const nextOptionTop = optionTop - shift;
  const nextOptionBottom = optionBottom - shift;
  const fits =
    nextLeadTop >= containerTop - 0.5 &&
    nextOptionTop >= containerTop - 0.5 &&
    nextOptionBottom <= containerBottom + 0.5;
  return fits ? withLead : row;
}
