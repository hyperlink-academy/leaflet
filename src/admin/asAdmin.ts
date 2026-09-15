import { getAuthIdentity } from "src/auth";
import { Ok, Err, type Result } from "src/result";
import { isAdminEmail } from "src/adminAllowlist";

// Run an admin-only server action body. Errors are returned as messages
// rather than thrown: Next redacts thrown server-action errors in production,
// and the admin needs the real reason.
export async function asAdmin<T>(
  scope: string,
  fn: () => Promise<T>,
): Promise<Result<T, string>> {
  let identity = await getAuthIdentity();
  if (!identity || !isAdminEmail(identity.email))
    return Err("You're not allowed to do that.");
  try {
    return Ok(await fn());
  } catch (e) {
    console.error(`[admin/${scope}]`, e);
    return Err(e instanceof Error ? e.message : String(e));
  }
}
