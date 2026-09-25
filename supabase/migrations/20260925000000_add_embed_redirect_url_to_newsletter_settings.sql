-- Where the embeddable subscribe form sends subscribers after they confirm.
-- Null falls back to the publication's URL.
alter table "public"."publication_newsletter_settings"
  add column "embed_redirect_url" text;
