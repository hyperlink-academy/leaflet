// A canvas that is a publication's page is as wide as the inside of the
// publication's page, so it shows at 1:1 wherever the page fits: the page
// width setting, less the card's 1px borders when the page background is
// shown.
export function publicationCanvasWidth(
  pageWidth: number | null | undefined,
  showPageBackground: boolean,
) {
  return (pageWidth || 624) - (showPageBackground ? 2 : 0);
}
