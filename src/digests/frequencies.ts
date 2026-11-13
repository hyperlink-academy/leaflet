import { DateTime } from "luxon";

// Calendar boundaries, rather than fixed millisecond intervals, respect DST.
export const digestFrequencies = {
  daily: { label: "Daily", unit: "day", every: 1 },
  weekly: { label: "Weekly", unit: "week", every: 1 },
} as const;
export type DigestFrequency = keyof typeof digestFrequencies;
export const digestFrequencyValues = Object.keys(digestFrequencies) as [
  DigestFrequency,
  ...DigestFrequency[],
];
export const digestLabels = Object.fromEntries([
  ["off", "Off"],
  ...digestFrequencyValues.map((value) => [
    value,
    digestFrequencies[value].label,
  ]),
]) as Record<"off" | DigestFrequency, string>;

export function isDigestFrequency(value: unknown): value is DigestFrequency {
  return typeof value === "string" && Object.hasOwn(digestFrequencies, value);
}

export function nextDigestAt(
  frequency: DigestFrequency,
  after: string,
  zone = process.env.DIGEST_TIME_ZONE || "UTC",
) {
  const { unit, every } = digestFrequencies[frequency];
  const next = DateTime.fromISO(after, { zone })
    .plus({ [unit]: every })
    .startOf(unit)
    .toUTC()
    .toISO();
  if (!next) throw new Error("Invalid digest schedule time or timezone");
  return next;
}
