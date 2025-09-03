export const maxDuration = 60;
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import * as z from "zod";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

export type LinkPreviewBody = { url: string; type: "meta" | "image" };
export async function POST(req: NextRequest) {
  let body = (await req.json()) as LinkPreviewBody;
  let url = encodeURIComponent(body.url);
  if (body.type === "meta") {
    let result = await get_link_metadata(url);
    return Response.json(result);
  } else {
    let result = await get_link_image_preview(url);
    return Response.json(result);
  }
}

export type LinkPreviewMetadataResult = ReturnType<typeof get_link_metadata>;
export type LinkPreviewImageResult = ReturnType<typeof get_link_image_preview>;

async function get_link_image_preview(url: string) {
  let image = await fetch(
    `https://pro.microlink.io/?url=${url}&screenshot&viewport.width=1400&viewport.height=1213&embed=screenshot.url&meta=false&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );
  let key = await hash(url);
  if (image.status === 200) {
    await supabase.storage
      .from("url-previews")
      .upload(key, await image.arrayBuffer(), {
        contentType: image.headers.get("content-type") || undefined,
        upsert: true,
      });
  } else {
    console.log("an error occured rendering the website", await image.text());
  }

  return {
    url: supabase.storage.from("url-previews").getPublicUrl(key, {
      transform: { width: 240, height: 208, resize: "contain" },
    }).data.publicUrl,
    height: 208,
    width: 240,
  };
}
const hash = async (str: string) => {
  let hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

async function get_link_metadata(url: string) {
  let response = await fetch(
    `https://iframe.ly/api/iframely?url=${url}&api_key=${process.env.IFRAMELY_KEY!}&_layout=standard`,
    {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 60 * 10,
      },
    },
  );

  let json = await response.json();
  console.log(json);
  let result = iframelyApiResponse.safeParse(json);
  console.log(result.error);
  return result;
}

// Iframely API response type - minimal structure based on docs
let iframelyApiResponse = z.object({
  url: z.string(),
  meta: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      author: z.string().optional(),
      author_url: z.string().optional(),
      site: z.string().optional(),
      canonical: z.string().optional(),
      duration: z.number().optional(),
      date: z.string().optional(),
      medium: z.string().optional(),
    })
    .optional(),
  links: z
    .object({
      player: z
        .array(
          z.object({
            href: z.string(),
            rel: z.array(z.string()),
            type: z.string(),
            media: z
              .object({
                "aspect-ratio": z.number().optional(),
                height: z.number().optional(),
                width: z.number().optional(),
              })
              .optional(),
            html: z.string().optional(),
          }),
        )
        .optional(),
      thumbnail: z
        .array(
          z.object({
            href: z.string(),
            rel: z.array(z.string()),
            type: z.string(),
            media: z
              .object({
                height: z.number().optional(),
                width: z.number().optional(),
              })
              .optional(),
          }),
        )
        .optional(),
      image: z
        .array(
          z.object({
            href: z.string(),
            rel: z.array(z.string()),
            type: z.string(),
            media: z
              .object({
                height: z.number().optional(),
                width: z.number().optional(),
              })
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  html: z.string().optional(),
  rel: z.array(z.string()).optional(),
});
