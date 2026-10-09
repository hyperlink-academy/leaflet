// The inside of a publication's page, so its canvas shows at 1:1: the page
// width less the card's 1px borders when the page background is shown.
export function publicationCanvasWidth(
  pageWidth: number | null | undefined,
  showPageBackground: boolean,
) {
  return (pageWidth || 624) - (showPageBackground ? 2 : 0);
}
