import { supabaseServerClient } from "supabase/serverClient";
import type { PubLeafletContent } from "lexicons/api";
import {
  BROADCAST_PUBLICATION_COLUMNS,
  broadcastPostEmail,
  emailAuthorName,
  emailBodyFromPages,
  loadPaidMembers,
  loadUnsentSubscribers,
  resolveBroadcastSender,
  type RunStep,
  type Subscriber,
} from "src/emailPosts/broadcast";
import type { EmailPostAudience, EmailPostRow } from "src/emailPosts/types";

// Confirmed subscribers (or one reader's subscription, given `identityId`) in
// the email's audience it hasn't reached yet. "Free" means subscribers
// without a live paid membership.
export async function loadEmailPostRecipients(
  post: Pick<EmailPostRow, "id" | "publication" | "audience">,
  identityId?: string,
): Promise<Subscriber[]> {
  const subs = await loadUnsentSubscribers(
    post.publication,
    { key: "email_post", value: post.id },
    identityId,
  );
  const audience = post.audience as EmailPostAudience;
  if (audience === "all" || subs.length === 0) return subs;
  const isPaid = await loadPaidMembers(post.publication);
  return subs.filter((s) => isPaid(s) === (audience === "paid"));
}

export async function sendEmailPost(
  run: RunStep,
  post: EmailPostRow,
  recipients: Subscriber[],
) {
  const pub = await run("load-publication", async () => {
    const { data } = await supabaseServerClient
      .from("publications")
      .select(BROADCAST_PUBLICATION_COLUMNS)
      .eq("uri", post.publication)
      .maybeSingle();
    return data;
  });
  const sender = resolveBroadcastSender(pub);
  if (!sender.ok) return { error: sender.error };

  const authorName =
    (await run("load-byline", () =>
      emailAuthorName(post.created_by, post.byline_dids),
    )) ?? undefined;
  const { blocks, pages } = emailBodyFromPages(
    post.pages as unknown as PubLeafletContent.Main["pages"],
  );

  await broadcastPostEmail(run, {
    publicationUri: post.publication,
    authorDid: post.created_by,
    sender: sender.value,
    postTitle: post.title || "(untitled)",
    postDescription: post.description || undefined,
    postUrl: undefined,
    authorName,
    publishedAtLabel: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    blocks,
    pages,
    recipients,
    eventMetadata: { email_post: post.id },
  });
  return null;
}
