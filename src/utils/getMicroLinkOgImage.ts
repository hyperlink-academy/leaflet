import { cacheLife } from "next/cache";
import { headers } from "next/headers";

type ScreenshotOptions = {
  setJavaScriptEnabled?: boolean;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  noCache?: boolean;
};

export async function getMicroLinkOgImage(
  path: string,
  options?: ScreenshotOptions,
) {
  const headersList = await headers();
  let hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  if (process.env.NODE_ENV === "development") {
    protocol === "https";
    hostname = "leaflet.pub";
  }
  let full_path = `${protocol}://${hostname}${path}`;
  return getWebpageImage(full_path, {
    ...options,
    setJavaScriptEnabled: false,
  });
}

export async function getWebpageImage(
  url: string,
  options?: ScreenshotOptions,
) {
  if (options?.noCache) return fetchScreenshot(url, options);
  const shot = await cachedScreenshot(url, options);
  return new Response(shot.body, {
    status: shot.status,
    headers: {
      ...(shot.contentType ? { "Content-Type": shot.contentType } : {}),
      "Cache-Control": "public, max-age=60",
    },
  });
}

// Browser-rendered screenshots are expensive (seconds of Cloudflare
// rendering); the cache amortizes them the way the og-image routes'
// `revalidate = 60` did before cacheComponents.
async function cachedScreenshot(
  url: string,
  options: ScreenshotOptions | undefined,
): Promise<{ status: number; contentType: string | null; body: ArrayBuffer }> {
  "use cache";
  cacheLife("minutes");
  const response = await fetchScreenshot(url, options);
  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    body: await response.arrayBuffer(),
  };
}

async function fetchScreenshot(url: string, options?: ScreenshotOptions) {
  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT}/browser-rendering/screenshot`,
    {
      method: "POST",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        url,
        setJavaScriptEnabled: options?.setJavaScriptEnabled,
        // scrollPage triggers lazy-loaded content (e.g. quotes and their images
        // that sit below the fold) to render before we capture.
        scrollPage: true,
        addStyleTag: [
          {
            content: `* {scrollbar-width:none; }`,
          },
        ],
        gotoOptions: {
          // "networkidle2" waits past the `load` event until the page settles,
          // so above-the-fold images have painted. We bound it with an explicit
          // timeout (default is 30s, max 60s) so a stalled subresource fails
          // fast instead of hanging the whole navigation into a 422.
          waitUntil: "networkidle2",
          timeout: 30000,
        },
        // Settle delay after scrollPage so the lazy-loaded content/images it
        // surfaced have finished loading before the screenshot is taken.
        waitForTimeout: 2000,
        viewport: {
          width: options?.width || 1400,
          height: options?.height || 733,
          deviceScaleFactor: options?.deviceScaleFactor,
        },
      }),
    },
  );
}
