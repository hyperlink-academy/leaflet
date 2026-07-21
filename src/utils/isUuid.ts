// Postgres throws 22P02 ("invalid input syntax for type uuid") when a
// non-uuid string is compared against a uuid column, so validate untrusted
// input (url segments, bearer tokens, cookies) before querying with it.
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
