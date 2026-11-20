// The `closesAt` of a questions or reply block; see pub.leaflet.blocks.questions
// and pub.leaflet.blocks.reply.
export function submissionsClosed(
  closesAt: string | undefined | null,
  now = Date.now(),
) {
  if (!closesAt) return false;
  let time = new Date(closesAt).getTime();
  return !isNaN(time) && time <= now;
}

export type ClosesAtPreset = "week" | "twoWeeks" | "month";

// A week, two weeks or a month from today, a minute before midnight local time
export function presetClosesAt(preset: ClosesAtPreset) {
  let date = new Date();
  if (preset === "week") date.setDate(date.getDate() + 7);
  else if (preset === "twoWeeks") date.setDate(date.getDate() + 14);
  else date.setMonth(date.getMonth() + 1);
  date.setHours(23, 59, 0, 0);
  return date;
}
