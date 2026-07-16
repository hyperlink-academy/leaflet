import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { getCurrentDeploymentDomain } from "src/utils/getCurrentDeploymentDomain";

// Resolve an app path to an absolute url on the host serving this request
// (custom domains included). In development the app isn't publicly reachable
// by the screenshot service, so render against production instead.
export async function getOwnUrl(path: string) {
  if (process.env.NODE_ENV === "development")
    return `https://leaflet.pub${path}`;
  const domain = await getCurrentDeploymentDomain();
  return `${domain.slice(0, -1)}${path}`;
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

// Reuse one remote browser per server instance: launching is the slow part
// (~2.5s); a warm session takes a screenshot in ~1-2s. Cloudflare closes the
// session after it sits idle for keep_alive ms, and we reconnect lazily.
let cachedBrowser: Promise<Browser> | null = null;

function connectBrowser(): Promise<Browser> {
  if (!cachedBrowser) {
    cachedBrowser = puppeteer
      .connect({
        browserWSEndpoint: `wss://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT}/browser-rendering/devtools/browser?keep_alive=60000`,
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
      })
      .then((browser) => {
        browser.once("disconnected", () => {
          cachedBrowser = null;
        });
        return browser;
      });
    cachedBrowser.catch(() => {
      cachedBrowser = null;
    });
  }
  return cachedBrowser;
}

// Screenshot `url` at the given viewport over a warm CDP session against
// Cloudflare's browser rendering service. Returns a png buffer, or null when
// the screenshot fails, so callers can degrade instead of erroring.
export async function screenshotPage(
  url: string,
  options: PageScreenshotOptions,
): Promise<Buffer | null> {
  try {
    return await cdpScreenshot(url, options);
  } catch (e) {
    console.error("Screenshot failed:", e);
    return null;
  }
}

// Screenshot an app path and wrap it as an opengraph-image Response, at the
// standard og viewport unless overridden. Screenshotting uses puppeteer, so
// routes calling this must stay on the nodejs runtime.
export async function ogScreenshotResponse(
  path: string,
  options?: Partial<PageScreenshotOptions>,
) {
  const url = await getOwnUrl(path);
  const image = await screenshotPage(url, {
    ...serverRenderedPageWaits,
    width: 1400,
    height: 733,
    ...options,
  });
  if (!image) return new Response("Screenshot failed", { status: 502 });
  return new Response(new Uint8Array(image), {
    headers: { "Content-Type": "image/png" },
  });
}

async function cdpScreenshot(
  url: string,
  options: PageScreenshotOptions,
): Promise<Buffer> {
  const browser = await connectBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: options.width,
      height: options.height,
      deviceScaleFactor: options.deviceScaleFactor ?? 1,
    });
    if (options.setJavaScriptEnabled === false)
      await page.setJavaScriptEnabled(false);
    // Overlay scrollbars would show in the capture; hide them at the protocol
    // level since injecting a style tag needs page javascript.
    const session = await page.createCDPSession();
    await session
      .send("Emulation.setScrollbarsHidden", { hidden: true })
      .catch(() => {});

    await page.goto(url, { waitUntil: options.waitUntil, timeout: 30_000 });

    // Disabled page javascript also disables lazy-loading, so everything is
    // already loading and the scroll pass would be a no-op.
    if (options.scrollPage && options.setJavaScriptEnabled !== false)
      await scrollThroughPage(page);

    // Navigation top-anchors the fragment target; re-scroll it to the center
    // so the card shows document context on both sides of the quote.
    // (Runtime.evaluate works even with page javascript disabled.)
    const fragment = decodeURIComponent(new URL(url).hash.slice(1));
    if (fragment) {
      await page
        .evaluate((id) => {
          document.getElementById(id)?.scrollIntoView({ block: "center" });
        }, fragment)
        .catch(() => {});
    }

    if (options.waitForTimeout)
      await new Promise((r) => setTimeout(r, options.waitForTimeout));

    return Buffer.from(
      await page.screenshot({
        type: options.screenshotOptions?.type ?? "png",
        quality: options.screenshotOptions?.quality,
      }),
    );
  } finally {
    // Close the page but keep the browser connected for the next capture.
    await page.close().catch(() => {});
  }
}

// Step through the full scroll height to trigger lazy-loaded content, then
// return to the top (the resting position for whole-page captures; quote
// captures re-scroll to their fragment afterwards).
async function scrollThroughPage(page: Page) {
  await page
    .evaluate(async () => {
      const scroller = document.scrollingElement;
      if (!scroller) return;
      for (let y = 0; y < scroller.scrollHeight; y += window.innerHeight) {
        scroller.scrollTop = y;
        await new Promise((r) => setTimeout(r, 50));
      }
      scroller.scrollTop = 0;
    })
    .catch(() => {});
}
