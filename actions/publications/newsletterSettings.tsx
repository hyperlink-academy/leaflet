"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { LeafletConfirmEmail } from "emails/leafletConfirmEmail";
import { Ok, Err, type Result } from "src/result";
import {
  EMAIL_REGEX,
  generateConfirmationCode,
  matchesConfirmationCode,
  sendConfirmationEmail,
  type ConfirmationError,
} from "src/utils/confirmationEmail";

type RequestError = "unauthorized" | "invalid_email" | ConfirmationError;
type ConfirmError =
  | "unauthorized"
  | "no_pending_verification"
  | ConfirmationError;
type DisableError = "unauthorized" | "database_error";

async function assertPublicationOwner(publicationUri: string) {
  const [identity, { data: publication }] = await Promise.all([
    getIdentityData(),
    supabaseServerClient
      .from("publications")
      .select("identity_did")
      .eq("uri", publicationUri)
      .single(),
  ]);
  if (!identity || !identity.atp_did) return null;
  if (!publication || publication.identity_did !== identity.atp_did)
    return null;
  return identity;
}

export async function requestReplyToVerification(
  publicationUri: string,
  emailRaw: string,
): Promise<Result<null, RequestError>> {
  if (!(await assertPublicationOwner(publicationUri)))
    return Err("unauthorized");

  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return Err("invalid_email");

  const code = generateConfirmationCode();

  const { error } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .upsert(
      {
        publication: publicationUri,
        reply_to_email: email,
        confirmation_code: code,
        enabled: false,
        reply_to_verified_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "publication" },
    );
  if (error) {
    console.error("[newsletterSettings] upsert failed:", error);
    return Err("database_error");
  }

  const sent = await sendConfirmationEmail({
    to: email,
    subject: `Your newsletter reply-to code is ${code}`,
    template: <LeafletConfirmEmail code={code} />,
    text: `Paste this code to verify your newsletter reply-to address:\n\n${code}\n`,
    devLogTag: "newsletter reply-to",
    code,
  });
  if (!sent) return Err("email_send_failed");

  return Ok(null);
}

export async function confirmReplyToVerification(
  publicationUri: string,
  code: string,
): Promise<Result<null, ConfirmError>> {
  if (!(await assertPublicationOwner(publicationUri)))
    return Err("unauthorized");

  const { data: settings } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .select("confirmation_code, reply_to_email")
    .eq("publication", publicationUri)
    .maybeSingle();

  if (!settings || !settings.confirmation_code || !settings.reply_to_email) {
    return Err("no_pending_verification");
  }
  if (!matchesConfirmationCode(settings.confirmation_code, code)) {
    return Err("invalid_code");
  }

  const { error } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .update({
      enabled: true,
      reply_to_verified_at: new Date().toISOString(),
      confirmation_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("publication", publicationUri);
  if (error) {
    console.error("[newsletterSettings] confirm update failed:", error);
    return Err("database_error");
  }

  return Ok(null);
}

export async function disableNewsletter(
  publicationUri: string,
): Promise<Result<null, DisableError>> {
  if (!(await assertPublicationOwner(publicationUri)))
    return Err("unauthorized");

  const { error } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .update({
      enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("publication", publicationUri);
  if (error) {
    console.error("[newsletterSettings] disable update failed:", error);
    return Err("database_error");
  }

  return Ok(null);
}
