import { getWebpageImage } from "./getMicroLinkOgImage";

// Screenshot `url` (via the cloudflare browser rendering endpoint) as the
// 1200x630 webp used as a bsky external-card thumbnail. Returns null (rather
// than throwing) so callers can degrade to a card without an image.
export async function screenshotBskyCardImage(
  url: string,
): Promise<Buffer | null> {
  // Quote pages get the same framing as their /l-quote og-image route: a small
  // viewport at 2x scale so the anchor-scrolled quote fills the card, with JS
  // disabled so hydration can't reset the browser's anchor scroll before
  // capture. Everything else gets a desktop-width shot of the top of the page.
  // Both viewports land on exactly 1200x630 physical pixels, so the endpoint's
  // webp output is used as-is with no resize pass.
  let isQuote = new URL(url).pathname.includes("/l-quote/");
  let preview_image = await getWebpageImage(url, {
    ...(isQuote
      ? {
          width: 600,
          height: 315,
          deviceScaleFactor: 2,
          setJavaScriptEnabled: false,
        }
      : { width: 1200, height: 630 }),
    screenshotOptions: { type: "webp", quality: 85 },
    noCache: true,
  });

  if (!preview_image.ok) {
    console.error(
      `Screenshot for bsky card failed (${preview_image.status}): ${await preview_image
        .text()
        .catch(() => "")}`,
    );
    return null;
  }

  return Buffer.from(await preview_image.arrayBuffer());
}
