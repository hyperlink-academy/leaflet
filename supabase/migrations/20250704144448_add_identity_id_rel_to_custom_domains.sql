alter table "public"."custom_domains" add column "identity_id" uuid;

alter table "public"."custom_domains" add constraint "custom_domains_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE not valid;

alter table "public"."custom_domains" validate constraint "custom_domains_identity_id_fkey";
