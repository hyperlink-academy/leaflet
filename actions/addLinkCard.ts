"use server";
import * as z from "zod";

export async function addLinkCard(args: { link: string }) {
  console.log("addLinkCard");
  let result = await get_url_preview_data(args.link);
  return result;
}

let expectedAPIResponse = z.object({
  data: z.object({
    description: z.string().optional().nullable(),
    author: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    image: z
      .object({
        url: z.string(),
        width: z.number().optional().nullable(),
        height: z.number().optional().nullable(),
      })
      .nullable()
      .optional(),
    logo: z
      .object({
        url: z.string(),
        width: z.number().optional().nullable(),
        height: z.number().optional().nullable(),
      })
      .nullable()
      .optional(),
  }),
});

export const get_url_preview_data = async (url: string) => {
  let response = await fetch(`https://pro.microlink.io/?url=${url}`, {
    headers: {
      "x-api-key": process.env.MICROLINK_API_KEY!,
    },
  });

  let result = expectedAPIResponse.safeParse(await response.json());
  return result;
};
