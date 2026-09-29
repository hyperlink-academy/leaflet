-- publication_scheduled_posts ---------------------------------------------------
-- A publication draft waiting to be published at publish_at. Unlike an
-- email-only post nothing is snapshotted: the draft's content, title and tags
-- are read when the post goes out, so edits made after scheduling are
-- published. Only the share choices made on the publish page are stored here,
-- since the job that publishes has no author session to ask.
--
-- `revision` bumps on every save so a sleeping publish can tell it was
-- superseded. The row is deleted once the post is published, by whichever
-- publish gets there first (the scheduled one or the author publishing by
-- hand).
create table "public"."publication_scheduled_posts" (
    "id" uuid not null default gen_random_uuid(),
    "publication" text not null,
    "leaflet" uuid not null,
    "created_by" text not null,
    "publish_at" timestamp with time zone not null,
    "send_email" boolean not null default true,
    "show_in_discover" boolean not null default true,
    "bsky_post" jsonb,
    "status" text not null default 'scheduled',
    "revision" integer not null default 0,
    "error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."publication_scheduled_posts" enable row level security;

CREATE UNIQUE INDEX publication_scheduled_posts_pkey ON public.publication_scheduled_posts USING btree (id);
alter table "public"."publication_scheduled_posts" add constraint "publication_scheduled_posts_pkey" PRIMARY KEY using index "publication_scheduled_posts_pkey";

-- A constraint rather than a bare index, so PostgREST embeds a leaflet's
-- schedule as a single object.
CREATE UNIQUE INDEX publication_scheduled_posts_leaflet_key ON public.publication_scheduled_posts USING btree (leaflet);
alter table "public"."publication_scheduled_posts" add constraint "publication_scheduled_posts_leaflet_key" UNIQUE using index "publication_scheduled_posts_leaflet_key";
CREATE INDEX publication_scheduled_posts_publication_idx ON public.publication_scheduled_posts USING btree (publication);

alter table "public"."publication_scheduled_posts" add constraint "publication_scheduled_posts_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON UPDATE CASCADE ON DELETE CASCADE;
alter table "public"."publication_scheduled_posts" add constraint "publication_scheduled_posts_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."publication_scheduled_posts" add constraint "publication_scheduled_posts_status_check" CHECK (status IN ('scheduled','publishing','failed','paused'));
