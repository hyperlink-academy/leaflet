export const commentDeliveryKey = (uri: string) => `comments:live:${uri}`;

export function digestDeliveryKey(
  mode: "live" | "test",
  start: string,
  end: string,
) {
  // Match PostgreSQL's six fractional digits when migrating existing history.
  const timestamp = (value: string) =>
    new Date(value).toISOString().replace("Z", "000Z");
  return `digest:${mode}:${timestamp(start)}:${timestamp(end)}`;
}
