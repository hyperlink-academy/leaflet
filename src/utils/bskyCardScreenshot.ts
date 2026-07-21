import { screenshotPage, serverRenderedPageWaits } from "./screenshotPage";

// Screenshot `url` as the 1200x630 webp used as a bsky external-card
// thumbnail. Returns null (rather than throwing) so callers can degrade to a
// card without an image.
export async function screenshotBskyCardImage(
  url: string,
): Promise<Buffer | null> {
  // Quote pages get the same framing as their /l-quote og-image route: a small
  // viewport at 2x scale so the anchor-scrolled quote fills the card.
  // Everything else gets a desktop-width shot of the top of the page. Both
  // targets render their content server-side, so both use the fast
  // server-rendered wait recipe, and both viewports land on exactly 1200x630
  // physical pixels so the webp output is used as-is with no resize pass.
  let isQuote = new URL(url).pathname.includes("/l-quote/");
  return screenshotPage(url, {
    ...serverRenderedPageWaits,
    ...(isQuote
      ? { width: 600, height: 315, deviceScaleFactor: 2 }
      : { width: 1200, height: 630 }),
    screenshotOptions: { type: "webp", quality: 85 },
  });
}
