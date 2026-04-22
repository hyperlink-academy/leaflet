import { randomBytes } from "crypto";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateConfirmationCode() {
  return randomBytes(3).toString("hex").toUpperCase();
}

export function matchesConfirmationCode(stored: string, submitted: string) {
  return stored === submitted.trim().toUpperCase();
}

export type ConfirmationError =
  | "invalid_code"
  | "email_send_failed"
  | "database_error";

export async function sendConfirmationEmail(args: {
  to: string;
  subject: string;
  template: ReactElement;
  text: string;
  devLogTag: string;
  code: string;
}): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    console.log(`[${args.devLogTag}] code for ${args.to}: ${args.code}`);
    return true;
  }

  const html = await render(args.template);
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify({
      From: "Leaflet <accounts@leaflet.pub>",
      Subject: args.subject,
      To: args.to,
      TextBody: args.text,
      HtmlBody: html,
    }),
  });
  return res.ok;
}
