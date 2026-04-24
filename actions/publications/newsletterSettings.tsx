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

type ToggleError = "unauthorized" | "database_error";
type SetReplyToError =
  | "unauthorized"
  | "invalid_email"
  | "database_error"
  | ConfirmationError;
type ConfirmError =
  | "unauthorized"
  | "no_pending_verification"
  | ConfirmationError;

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

export async function enableNewsletter(
  publicationUri: string,
): Promise<Result<null, ToggleError>> {
  if (!(await assertPublicationOwner(publicationUri)))
    return Err("unauthorized");

  const { error } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .upsert(
      {
        publication: publicationUri,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "publication" },
    );
  if (error) {
    console.error("[newsletterSettings] enable upsert failed:", error);
    return Err("database_error");
  }
  return Ok(null);
}

export async function disableNewsletter(
  publicationUri: string,
): Promise<Result<null, ToggleError>> {
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

// If the email matches the user's identity email we trust the address and
// skip the confirmation flow.
export async function setReplyToEmail(
  publicationUri: string,
  emailRaw: string,
): Promise<Result<{ verification_required: boolean }, SetReplyToError>> {
  const identity = await assertPublicationOwner(publicationUri);
  if (!identity) return Err("unauthorized");

  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return Err("invalid_email");

  const identityEmail = identity.email?.trim().toLowerCase() ?? null;
  const trustedMatch = identityEmail !== null && identityEmail === email;

  if (trustedMatch) {
    const { error } = await supabaseServerClient
      .from("publication_newsletter_settings")
      .upsert(
        {
          publication: publicationUri,
          reply_to_email: email,
          reply_to_verified_at: new Date().toISOString(),
          confirmation_code: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "publication" },
      );
    if (error) {
      console.error(
        "[newsletterSettings] trusted reply-to upsert failed:",
        error,
      );
      return Err("database_error");
    }
    return Ok({ verification_required: false });
  }

  const code = generateConfirmationCode();
  const { error } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .upsert(
      {
        publication: publicationUri,
        reply_to_email: email,
        reply_to_verified_at: null,
        confirmation_code: code,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "publication" },
    );
  if (error) {
    console.error("[newsletterSettings] reply-to upsert failed:", error);
    return Err("database_error");
  }

  const sent = await sendConfirmationEmail({
    to: email,
    subject: `Your newsletter reply-to code is ${code}`,
    template: (
      <LeafletConfirmEmail
        code={code}
        assetsBaseUrl={process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"}
      />
    ),
    text: `Paste this code to verify your newsletter reply-to address:\n\n${code}\n`,
    devLogTag: "newsletter reply-to",
    code,
  });
  if (!sent) return Err("email_send_failed");

  return Ok({ verification_required: true });
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

export async function clearReplyToEmail(
  publicationUri: string,
): Promise<Result<null, ToggleError>> {
  if (!(await assertPublicationOwner(publicationUri)))
    return Err("unauthorized");

  const { error } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .update({
      reply_to_email: null,
      reply_to_verified_at: null,
      confirmation_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("publication", publicationUri);
  if (error) {
    console.error("[newsletterSettings] clear reply-to failed:", error);
    return Err("database_error");
  }
  return Ok(null);
}
