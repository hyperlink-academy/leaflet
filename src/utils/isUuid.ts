// Postgres throws 22P02 ("invalid input syntax for type uuid") when a
// non-uuid string is compared against a uuid column, so validate untrusted
// input (url segments, bearer tokens, cookies) before querying with it.
// Matches no row (ids are generated randomly); substitute it for invalid
// input when short-circuiting the query would complicate result typing.
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
