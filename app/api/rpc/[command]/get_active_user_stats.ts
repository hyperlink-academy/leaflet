import { z } from "zod";
import { makeRoute } from "../lib";
import { getAuthIdentity } from "src/auth";
import { isAdminEmail } from "src/adminAllowlist";
import { getProfiles } from "src/identity/profileCache";
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
    recent_window_days: z.number().int().min(1).max(365).optional(),
  }),
  handler: async ({ granularity, from, to, recent_window_days }) => {
    const identity = await getAuthIdentity();
    if (!isAdminEmail(identity?.email)) {
      return { error: "unauthorized" as const };
    }

    let [timeseries, windows, recent] = await Promise.all([
      tinybird.activeUsersTimeseries.query({
        granularity,
        date_from: from,
        ...(to ? { date_to: to } : {}),
      }),
      tinybird.activeUsersWindows.query(),
      tinybird.activeUsersRecent.query({
        window_days: recent_window_days ?? 7,
        limit: 50,
      }),
    ]);

    let profiles = await getProfiles(
      recent.data.map((r) => r.did).filter((d) => !!d),
    );

    return {
      result: {
        timeseries: timeseries.data,
        windows: {
          day: windows.data.find((w) => w.window_days === 1) ?? null,
          week: windows.data.find((w) => w.window_days === 7) ?? null,
          month: windows.data.find((w) => w.window_days === 30) ?? null,
        },
        recent: recent.data.map((r) => ({
          ...r,
          handle: r.did ? profiles.get(r.did)?.handle ?? null : null,
        })),
      },
    };
  },
});
