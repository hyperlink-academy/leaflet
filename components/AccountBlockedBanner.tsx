import { getAuthIdentity } from "src/auth";
import { blockedAmong, DISPUTE_EMAIL } from "src/review/blocked";

// Everyone else gets a plain 404 for a blocked account's pages. Its owner,
// signed in, is the one person who needs to know why and who to write to.
export async function AccountBlockedBanner() {
  let identity = await getAuthIdentity();
  let did = identity?.atp_did;
  if (!did || !(await blockedAmong([did])).has(did)) return null;
  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 bg-bg-page border-b border-border px-4 py-2 text-sm text-center leading-snug"
    >
      <span className="font-bold">Your account has been blocked.</span> We block
      accounts that publish spam, so your posts are no longer visible and you
      can&apos;t publish. If you think we got it wrong, write to{" "}
      <a
        href={`mailto:${DISPUTE_EMAIL}`}
        className="text-accent-contrast hover:underline"
      >
        {DISPUTE_EMAIL}
      </a>{" "}
      and we&apos;ll take another look.
    </div>
  );
}
