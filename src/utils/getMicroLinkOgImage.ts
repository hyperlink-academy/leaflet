import { headers } from "next/headers";

export async function getMicroLinkOgImage(
  path: string,
  options?: {
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    noCache?: boolean;
  },
) {
  const headersList = await headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  let full_path = `${protocol}://${hostname}${path}`;
  return getWebpageImage(full_path, options);
}

export async function getWebpageImage(
  url: string,
  options?: {
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    noCache?: boolean;
  },
) {
  let response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT}/browser-rendering/screenshot`,
    {
      method: "POST",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        url,
        addStyleTag: [
          {
            content: `* {overflow: hidden !important; }`,
          },
        ],
        gotoOptions: {
          waitUntil: "load",
        },
        viewport: {
          width: options?.width || 1400,
          height: options?.height || 733,
          deviceScaleFactor: options?.deviceScaleFactor,
        },
      }),
      next: !options?.noCache
        ? undefined
        : {
            revalidate: 600,
          },
    },
  );
  const clonedResponse = response.clone();
  if (clonedResponse.status == 200) {
    clonedResponse.headers.set(
      "CDN-Cache-Control",
      "s-maxage=600, stale-while-revalidate=3600",
    );
    clonedResponse.headers.set(
      "Cache-Control",
      "s-maxage=600, stale-while-revalidate=3600",
    );
  }

  return clonedResponse;
}
