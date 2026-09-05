import { z } from "zod";
import { makeRoute } from "../lib";
import { getAuthIdentity } from "src/auth";
import { isAdminEmail } from "src/adminAllowlist";
import { tinybird } from "lib/tinybird";

export type GetActiveUserStatsReturnType = Awaited<
  ReturnType<(typeof get_active_user_stats)["handler"]>
>;

export const get_active_user_stats = makeRoute({
  route: "get_active_user_stats",
  input: z.object({
    granularity: z.enum(["day", "week", "month"]),
    from: z.string(),
    to: z.string().optional(),
  }),
  handler: async ({ granularity, from, to }) => {
    const identity = await getAuthIdentity();
    if (!isAdminEmail(identity?.email)) {
      return { error: "unauthorized" as const };
    }

    let [timeseries, windows] = await Promise.all([
      tinybird.activeUsersTimeseries.query({
        granularity,
        date_from: from,
        ...(to ? { date_to: to } : {}),
      }),
      tinybird.activeUsersWindows.query(),
    ]);

    let byWindow = (days: number) =>
      windows.data.find((w) => w.window_days === days)?.active ?? null;

    return {
      result: {
        timeseries: timeseries.data,
        windows: { day: byWindow(1), week: byWindow(7), month: byWindow(30) },
      },
    };
  },
});
