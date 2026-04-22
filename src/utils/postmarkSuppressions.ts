// Thin wrapper over Postmark's Suppressions API on the shared `broadcast`
// stream. Used by the subscribe-request path to check whether an address is
// suppressed (and clear hard bounces / manual suppressions), and by the Phase 7
// webhook handler's sibling code paths.
//
// Docs: https://postmarkapp.com/developer/api/suppressions-api

const POSTMARK_API = "https://api.postmarkapp.com";
const BROADCAST_STREAM = "broadcast";

export type SuppressionReason =
  | "HardBounce"
  | "SpamComplaint"
  | "ManualSuppression";

export type SuppressionLookup = {
  email: string;
  reason: SuppressionReason;
} | null;

function token(): string | null {
  return process.env.POSTMARK_API_KEY ?? null;
}

/** Returns the suppression entry for `email` on the broadcast stream, or null if not suppressed / on error. */
export async function getSuppression(email: string): Promise<SuppressionLookup> {
  const key = token();
  if (!key) return null;
  const url =
    `${POSTMARK_API}/message-streams/${BROADCAST_STREAM}/suppressions/dump` +
    `?emailaddress=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Postmark-Server-Token": key,
    },
  });
  if (!res.ok) {
    console.error(
      "[postmarkSuppressions] lookup failed:",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }
  const data = (await res.json()) as {
    Suppressions: Array<{
      EmailAddress: string;
      SuppressionReason: string;
    }>;
  };
  const lower = email.toLowerCase();
  const match = data.Suppressions?.find(
    (s) => s.EmailAddress.toLowerCase() === lower,
  );
  if (!match) return null;
  const reason = match.SuppressionReason as SuppressionReason;
  return { email: match.EmailAddress, reason };
}

/** Attempts to delete the suppression for `email` on the broadcast stream.
 * Returns true on success. Postmark permanently refuses SpamComplaint
 * deletions — callers should gate on getSuppression() first.
 */
export async function deleteSuppression(email: string): Promise<boolean> {
  const key = token();
  if (!key) return false;
  const res = await fetch(
    `${POSTMARK_API}/message-streams/${BROADCAST_STREAM}/suppressions/delete`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": key,
      },
      body: JSON.stringify({
        Suppressions: [{ EmailAddress: email }],
      }),
    },
  );
  if (!res.ok) {
    console.error(
      "[postmarkSuppressions] delete failed:",
      res.status,
      await res.text().catch(() => ""),
    );
    return false;
  }
  const data = (await res.json()) as {
    Suppressions: Array<{
      EmailAddress: string;
      Status: "Deleted" | "Failed";
      Message: string;
    }>;
  };
  const lower = email.toLowerCase();
  const entry = data.Suppressions?.find(
    (s) => s.EmailAddress.toLowerCase() === lower,
  );
  return entry?.Status === "Deleted";
}
