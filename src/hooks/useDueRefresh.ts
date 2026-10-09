import { useEffect, useState } from "react";

const REFRESH_MS = 3_000;
const REFRESH_WINDOW_MS = 10 * 60_000;
// setTimeout fires immediately for a delay past 2^31 - 1 ms.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

// The current time for a list of jobs that run at a set time, fresh enough to
// tell which of them are due. While one is running (its status says so, or
// it's "scheduled" and its time has come) this ticks every few seconds and
// calls `refresh`, so the job settles on screen without a reload; otherwise
// it wakes when the next one comes due. A job that hasn't settled within the
// window is stuck, not slow.
export function useDueRefresh(
  jobs: { status: string; dueAt: string | null }[],
  runningStatus: string,
  refresh: () => void,
) {
  let [now, setNow] = useState(() => Date.now());
  let running = false;
  let next = Infinity;
  for (let job of jobs) {
    let at = new Date(job.dueAt ?? 0).getTime();
    if (job.status === "scheduled" && at > now) next = Math.min(next, at);
    else if (
      (job.status === "scheduled" || job.status === runningStatus) &&
      now - at < REFRESH_WINDOW_MS
    )
      running = true;
  }
  useEffect(() => {
    if (!running && next === Infinity) return;
    let timeout = setTimeout(
      () => {
        setNow(Date.now());
        if (running) refresh();
      },
      running ? REFRESH_MS : Math.min(next - now, MAX_TIMEOUT_MS),
    );
    return () => clearTimeout(timeout);
  }, [running, next, now, refresh]);
  return now;
}
