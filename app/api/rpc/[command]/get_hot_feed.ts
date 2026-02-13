import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getHotFeed } from "app/(home-pages)/reader/getHotFeed";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";

export type GetHotFeedReturnType = Awaited<
  ReturnType<(typeof get_hot_feed)["handler"]>
>;

export const get_hot_feed = makeRoute({
  route: "get_hot_feed",
  input: z.object({}),
  handler: async ({}, {}: Pick<Env, "supabase">) => {
    return await getHotFeed();
  },
});
