import { createHash } from "crypto";
import sharp from "sharp";
import { supabaseServerClient } from "supabase/serverClient";
import type { Json } from "supabase/database.types";
import {
  getOwnUrl,
  screenshotPage,
  serverRenderedPageWaits,
} from "src/utils/screenshotPage";
import { AtUri } from "@atproto/syntax";
import {
  collectEmailRenderTargets,
  emailRenderSize,
  type EmailRenderImage,
  type EmailRenderSpec,
} from "./spec";

// Bump when the render page's output changes, so new sends re-render.
const RENDER_VERSION = 1;

function emailRenderKey(spec: EmailRenderSpec) {
  return createHash("sha256")
    .update(JSON.stringify({ v: RENDER_VERSION, spec }))
    .digest("hex");
}

const BUCKET = "minilink-user-assets";
const storagePath = (key: string) => `email-renders/${key}.png`;

export async function loadEmailRenderSpec(
  key: string,
): Promise<EmailRenderSpec | null> {
  let { data } = await supabaseServerClient
    .from("email_render_images")
    .select("spec")
    .eq("key", key)
    .maybeSingle();
  return (data?.spec as unknown as EmailRenderSpec) ?? null;
}

// The stored PNG for `key`, rendering and storing it first if it isn't yet.
// Null when the key is unknown or the render or upload fails: an image that
// isn't stored would be re-rendered on every fetch.
export async function getOrRenderEmailImage(
  key: string,
  knownSpec?: EmailRenderSpec,
): Promise<Buffer | null> {
  let stored = await supabaseServerClient.storage
    .from(BUCKET)
    .download(storagePath(key));
  if (stored.data) return Buffer.from(await stored.data.arrayBuffer());

  let spec = knownSpec ?? (await loadEmailRenderSpec(key));
  if (!spec) return null;
  let image = await renderEmailImage(key, spec);
  if (!image) return null;
  let upload = await supabaseServerClient.storage
    .from(BUCKET)
    .upload(storagePath(key), image, {
      contentType: "image/png",
      upsert: true,
    });
  if (upload.error) {
    console.error("[email-render] upload failed:", key, upload.error);
    return null;
  }
  return image;
}

async function renderEmailImage(key: string, spec: EmailRenderSpec) {
  let url = getOwnUrl(`/email-render/${key}`);
  // The screenshot service captures whatever the URL serves, error pages
  // included, and the result is stored for good.
  let probe = await fetch(url, { method: "HEAD" }).catch(() => null);
  if (!probe?.ok) {
    console.error(
      "[email-render] render page unavailable:",
      key,
      probe?.status,
    );
    return null;
  }
  let size = emailRenderSize(spec);
  let image = await screenshotPage(url, {
    ...serverRenderedPageWaits,
    width: size.width,
    height: size.height,
    deviceScaleFactor: 1,
    screenshotOptions: { type: "png" },
  });
  if (!image) return null;
  return spec.trimBottom
    ? trimBottom(image, Math.round(24 * size.scale))
    : image;
}

// Crops rows at the bottom that are all the bottom-left pixel's color,
// leaving `padding` px of them.
async function trimBottom(image: Buffer, padding: number) {
  let { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let { width, height, channels } = info;
  let bg = (height - 1) * width * channels;
  let differs = (i: number) =>
    Math.abs(data[i] - data[bg]) > 8 ||
    Math.abs(data[i + 1] - data[bg + 1]) > 8 ||
    Math.abs(data[i + 2] - data[bg + 2]) > 8 ||
    Math.abs(data[i + 3] - data[bg + 3]) > 8;
  let lastRow = height - 1;
  rows: for (; lastRow > 0; lastRow--)
    for (let x = 0; x < width; x++)
      if (differs((lastRow * width + x) * channels)) break rows;
  let keep = Math.min(height, lastRow + 1 + padding);
  if (keep >= height) return image;
  return sharp(image)
    .extract({ left: 0, top: 0, width, height: keep })
    .png()
    .toBuffer();
}

// Registers and renders every canvas in a post email, themed like
// the publication, returning them by the id PostEmail looks them up under.
// Best-effort: anything that fails to register or render is left out, and
// PostEmail falls back to its HTML rendering for it.
export async function prepareEmailRenderImages(args: {
  body: Parameters<typeof collectEmailRenderTargets>[0];
  authorDid: string;
  publicationUri: string;
  pubRecord?: EmailRenderSpec["theme"] | null;
  assetsBaseUrl: string;
}): Promise<Record<string, EmailRenderImage>> {
  let themeDid = new AtUri(args.publicationUri).host;
  let targets = collectEmailRenderTargets(args.body);
  let entries = Object.entries(targets).map(([id, target]) => {
    let spec: EmailRenderSpec = {
      ...target,
      did: args.authorDid,
      themeDid,
      theme: {
        theme: args.pubRecord?.theme,
        basicTheme: args.pubRecord?.basicTheme,
      },
    };
    return { id, spec, key: emailRenderKey(spec) };
  });
  if (entries.length === 0) return {};

  let { error } = await supabaseServerClient.from("email_render_images").upsert(
    entries.map((e) => ({ key: e.key, spec: e.spec as unknown as Json })),
    { onConflict: "key", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[email-render] register failed:", error);
    return {};
  }

  // Few at a time: each is a Cloudflare browser session, and a rate-limited
  // render is frozen into the send's step result as a fallback.
  let rendered = await mapLimit(entries, 3, async (e) => {
    try {
      if (!(await getOrRenderEmailImage(e.key, e.spec))) return null;
      let src = `${args.assetsBaseUrl.replace(/\/$/, "")}/api/email-render/${e.key}.png`;
      return [e.id, { src }] as const;
    } catch (err) {
      console.error("[email-render] render failed:", e.key, err);
      return null;
    }
  });
  return Object.fromEntries(rendered.filter((r) => r !== null));
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
) {
  let results: R[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        let i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}
