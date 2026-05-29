/**
 * site.standard.publication records carry an optional `theme` field that the
 * lexicon types as a union requiring a `$type` discriminator. Some records in
 * the wild have a `theme` object missing `$type`, which makes
 * `validateRecord` reject the entire publication — dropping it from the index.
 *
 * Strip a malformed (no-`$type`) theme so the rest of the record can still be
 * validated and indexed. Returns the record unchanged when there's nothing to
 * strip, and never mutates the input.
 */
export function stripThemeWithoutType<T>(record: T): T {
  if (record && typeof record === "object" && "theme" in record) {
    const theme = (record as Record<string, unknown>).theme;
    if (theme && typeof theme === "object" && !("$type" in theme)) {
      const { theme: _theme, ...rest } = record as Record<string, unknown>;
      return rest as T;
    }
  }
  return record;
}
