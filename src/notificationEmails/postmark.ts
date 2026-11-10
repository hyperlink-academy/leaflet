import { z } from "zod";

export type PostmarkEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  tag: string;
};

// "rejected" is a structured refusal, so retrying is safe. "uncertain" means
// the request may have gone through (timeout, dropped connection, unreadable
// reply), so retrying could send a duplicate.
export type PostmarkOutcome =
  | { outcome: "sent"; messageId: string | null }
  | { outcome: "rejected" }
  | { outcome: "uncertain" };

const postmarkReply = z.object({
  ErrorCode: z.number(),
  MessageID: z.string().optional(),
});

export const isPostmarkConfigured = (
  apiKey: string | undefined,
): apiKey is string => !!apiKey && apiKey !== "POSTMARK_API_TEST";

export async function sendPostmarkEmail(
  email: PostmarkEmail,
  apiKey: string,
): Promise<PostmarkOutcome> {
  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": apiKey,
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        From: email.from,
        To: email.to,
        Subject: email.subject,
        TextBody: email.text,
        ...(email.html && { HtmlBody: email.html }),
        Tag: email.tag,
      }),
    });
    const reply = postmarkReply.parse(await response.json());
    if (response.ok && reply.ErrorCode === 0)
      return { outcome: "sent", messageId: reply.MessageID ?? null };
    return reply.ErrorCode !== 0
      ? { outcome: "rejected" }
      : { outcome: "uncertain" };
  } catch {
    return { outcome: "uncertain" };
  }
}
