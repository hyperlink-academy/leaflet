-- The admin review queue at /admin/publications. createPublication adds a row
-- for every publication made in Leaflet; a row with no reviewed_at is still
-- in the queue. Kept off the publications row so the spam flag never rides
-- along in the `publications(*)` selects that reach clients.
create table "public"."publication_reviews" (
    "publication" text not null,
    "queued_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" uuid,
    "spam" boolean not null default false
);

alter table "public"."publication_reviews" enable row level security;

CREATE UNIQUE INDEX publication_reviews_pkey ON public.publication_reviews USING btree (publication);

alter table "public"."publication_reviews" add constraint "publication_reviews_pkey" PRIMARY KEY using index "publication_reviews_pkey";

CREATE INDEX publication_reviews_pending_idx ON public.publication_reviews USING btree (queued_at DESC) WHERE (reviewed_at IS NULL);

alter table "public"."publication_reviews" add constraint "publication_reviews_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."publication_reviews" add constraint "publication_reviews_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES identities(id) ON DELETE SET NULL;

revoke all on table "public"."publication_reviews" from "anon", "authenticated";
grant all on table "public"."publication_reviews" to "service_role";
