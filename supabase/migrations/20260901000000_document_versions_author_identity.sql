-- Who saved a version. author_did only covers atproto identities, so
-- email-only authors were unattributable; the identity is the join back to
-- both the did (for a bsky profile) and the email fallback.
alter table "public"."document_versions" add column "author_identity" uuid;

alter table "public"."document_versions" add constraint "document_versions_author_identity_fkey" FOREIGN KEY (author_identity) REFERENCES identities(id) ON DELETE SET NULL not valid;

alter table "public"."document_versions" validate constraint "document_versions_author_identity_fkey";
