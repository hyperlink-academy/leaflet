alter table "public"."custom_domains" alter column "identity" drop not null;
alter table "public"."publication_domains" add column "identity" text not null;
alter table "public"."publication_domains" add constraint "publication_domains_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(atp_did) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."publication_domains" validate constraint "publication_domains_identity_fkey";
