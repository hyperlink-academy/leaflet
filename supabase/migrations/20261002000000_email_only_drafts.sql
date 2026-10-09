-- An email-only draft is created as one from the dashboard's Emails tab and
-- only ever goes out through the email send flow, never the publish flow.
alter table "public"."leaflets_in_publications"
  add column "email_only" boolean not null default false;

update "public"."leaflets_in_publications"
  set email_only = true
  where leaflet in (select leaflet from "public"."publication_email_posts");
