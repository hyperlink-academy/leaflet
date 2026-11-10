import type { PoolClient } from "pg";
import { pool } from "supabase/pool";
import { EMAIL_NOTIFICATION_ENTITLEMENT_KEY } from "src/entitlements";

// Workers read the current grant so revocation/expiration stops queued emails.
export async function emailNotificationsEnabled(
  identity: string,
  db: Pick<PoolClient, "query"> = pool,
) {
  const { rows } = await db.query(
    "SELECT 1 FROM user_entitlements WHERE identity_id=$1 AND entitlement_key=$2 AND (expires_at IS NULL OR expires_at > now())",
    [identity, EMAIL_NOTIFICATION_ENTITLEMENT_KEY],
  );
  return rows.length > 0;
}
