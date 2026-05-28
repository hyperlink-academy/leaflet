-- comments_on_documents.profile stores the commenter's DID, but it no longer
-- needs to reference a bsky_profiles row: commenter profiles are now resolved
-- through the profile cache (getProfiles), and nothing writes to bsky_profiles
-- anymore. Drop the foreign key so comment inserts don't require a pre-existing
-- bsky_profiles row. The profile column itself stays populated (read by
-- getProfileComments via .eq("profile", did)).
alter table "public"."comments_on_documents"
  drop constraint if exists "comments_on_documents_profile_fkey";
