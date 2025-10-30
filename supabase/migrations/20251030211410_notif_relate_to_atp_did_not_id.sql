alter table "public"."notif_comments" drop constraint "notif_comments_identity_fkey";

alter table "public"."notif_comments" alter column "identity" set data type text using "identity"::text;

alter table "public"."notif_comments" add constraint "notif_comments_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(atp_did) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."notif_comments" validate constraint "notif_comments_identity_fkey";
