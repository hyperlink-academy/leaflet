-- Onboarding tutorial state. New accounts start with it on; the backfill turns
-- it off for everyone who already has an account, so existing users don't get
-- a tutorial banner they never asked for.
alter table "public"."identities"
  add column "tutorial" boolean not null default true;

update "public"."identities" set "tutorial" = false;
