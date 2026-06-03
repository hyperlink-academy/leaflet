// Result type - a discriminated union for handling success/error cases
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Constructors
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// The success value type of a Result. Lets callers infer an action's payload
// type from its return (`OkValue<Awaited<ReturnType<typeof action>>>`) instead
// of the action exporting a dedicated type.
export type OkValue<R> = R extends { ok: true; value: infer T } ? T : never;
