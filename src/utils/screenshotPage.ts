import { MAIN_SITE_URL } from "src/utils/customDomain";

// Resolve an app path to an absolute url on this deployment's canonical origin.
// Deliberately not the request's Host header: reading it would make every
// og-image route dynamic, and the page a custom domain serves at this path is
// the same one the main site serves. In development the app isn't publicly
// reachable by the screenshot service, so render against production instead.
export function getOwnUrl(path: string) {
  if (process.env.NODE_ENV === "development")
    return `https://leaflet.pub${path}`;
  return `${MAIN_SITE_URL.replace(/\/$/, "")}${path}`;
}

export type PageScreenshotOptions = {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  // Off for fully server-rendered targets (e.g. quote pages): nothing in the
  // capture needs scripts, and without them the page settles at `load`.
  setJavaScriptEnabled?: boolean;
  waitUntil: "load" | "networkidle2";
  // Scroll through the page before capturing so lazy-loaded content renders.
  scrollPage: boolean;
  // Settle delay (ms) before the capture, after scrolling.
  waitForTimeout: number;
  screenshotOptions?: { type?: "png" | "jpeg" | "webp"; quality?: number };
};

// Wait recipe for server-rendered targets (/l-quote pages, leaflet pages):
// the content, fonts, and embeds are all in the SSR HTML, so scripts stay
// off (which also keeps hydration from resetting the anchor scroll) and the
// page settles at `load` plus a short delay for fonts — much faster than
// networkidle2 on the scripted page.
export const serverRenderedPageWaits = {
  setJavaScriptEnabled: false,
  waitUntil: "load",
  scrollPage: true,
  waitForTimeout: 500,
} satisfies Partial<PageScreenshotOptions>;

// Screenshot `url` at the given viewport via Cloudflare browser rendering's
// one-shot REST endpoint. Cloudflare bills browser rendering by session
// duration, and a REST session ends when the render does, so billed browser
// time stays proportional to screenshots actually taken. Returns an image
// buffer, or null when the screenshot fails, so callers can degrade instead
// of erroring.
export async function screenshotPage(
  url: string,
  options: PageScreenshotOptions,
): Promise<Buffer | null> {
  try {
    let response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT}/browser-rendering/screenshot`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: JSON.stringify({
          url,
          setJavaScriptEnabled: options.setJavaScriptEnabled,
          screenshotOptions: options.screenshotOptions,
          // Disabled page javascript also disables lazy-loading, so everything
          // renders without a scroll pass — and skipping it keeps quote pages
          // resting at their fragment anchor for the capture.
          scrollPage:
            options.scrollPage && options.setJavaScriptEnabled !== false,
          // Overlay scrollbars would show in the capture.
          addStyleTag: [{ content: `* {scrollbar-width:none; }` }],
          gotoOptions: {
            waitUntil: options.waitUntil,
            // Bound navigation (default is 30s, max 60s) so a stalled
            // subresource fails fast instead of hanging the whole render.
            timeout: 30_000,
          },
          waitForTimeout: options.waitForTimeout,
          viewport: {
            width: options.width,
            height: options.height,
            deviceScaleFactor: options.deviceScaleFactor,
          },
        }),
      },
    );
    if (!response.ok) {
      console.error(
        "Screenshot failed:",
        response.status,
        await response.text().catch(() => ""),
      );
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (e) {
    console.error("Screenshot failed:", e);
    return null;
  }
}

// Screenshot an app path and wrap it as an opengraph-image Response, at the
// standard og viewport unless overridden.
export async function ogScreenshotResponse(
  path: string,
  options?: Partial<PageScreenshotOptions>,
) {
  const url = getOwnUrl(path);
  const image = await screenshotPage(url, {
    ...serverRenderedPageWaits,
    width: 1400,
    height: 733,
    ...options,
  });
  if (!image) return new Response("Screenshot failed", { status: 502 });
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      // Let the CDN absorb unfurl-bot traffic between ISR regenerations —
      // each miss is a multi-second remote-browser render.
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
