/**
 * Sanitizes integer fields in records before they are written to a PDS.
 *
 * AT Protocol lexicons have no `float` or `number` type — every numeric field
 * is an integer. JavaScript only has a single Number type, so values read from
 * a Supabase JSON column (or any other source) may carry fractional parts.
 * The CBOR encoder would then serialize them as floats, and downstream
 * consumers that validate against the lexicon would reject the record.
 *
 * `sanitizeIntegers` walks the record and rounds every number it encounters.
 * Class instances (BlobRef, CID, etc.) are preserved as-is so their prototype
 * chain stays intact.
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

export function sanitizeIntegers<T>(value: T): T {
  if (typeof value === "number") {
    return (Number.isFinite(value) ? Math.round(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeIntegers) as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeIntegers(v);
    }
    return out as T;
  }
  return value;
}
