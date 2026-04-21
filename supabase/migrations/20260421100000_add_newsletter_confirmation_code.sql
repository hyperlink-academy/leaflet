-- Phase 2: add pending confirmation code for reply-to verification.
-- Lives on the settings row; nulled out on successful verification.

alter table "public"."publication_newsletter_settings"
  add column "confirmation_code" text;
