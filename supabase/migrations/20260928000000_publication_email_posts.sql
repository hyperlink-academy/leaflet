-- publication_email_posts -----------------------------------------------------
-- A post sent only as a newsletter email, never written to a PDS. The content
-- is a snapshot of the draft taken when the author schedules (and re-taken on
-- each update), so edits in the editor don't reach subscribers until saved.
--
-- send_mode 'scheduled' sends once at send_at (now, for an immediate send);
-- 'on_subscribe' sends to each new subscriber in `audience` as they join.
-- `revision` bumps on every save so a sleeping scheduled send can tell it was
-- superseded. `image_paths` holds the storage object names the snapshot's
-- images point at, so blob GC keeps them after they leave the live draft.
create table "public"."publication_email_posts" (
    "id" uuid not null default gen_random_uuid(),
    "publication" text not null,
    "leaflet" uuid not null,
    "created_by" text not null,
    "title" text not null default '',
    "description" text not null default '',
    "pages" jsonb not null,
    "byline_dids" text[] not null default '{}',
    "image_paths" text[] not null default '{}',
    "send_mode" text not null,
    "send_at" timestamp with time zone,
    "audience" text not null default 'all',
    "status" text not null,
    "revision" integer not null default 0,
    "subscriber_count" integer,
    "sent_at" timestamp with time zone,
    "error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."publication_email_posts" enable row level security;

CREATE UNIQUE INDEX publication_email_posts_pkey ON public.publication_email_posts USING btree (id);
alter table "public"."publication_email_posts" add constraint "publication_email_posts_pkey" PRIMARY KEY using index "publication_email_posts_pkey";

CREATE UNIQUE INDEX publication_email_posts_leaflet_key ON public.publication_email_posts USING btree (leaflet);
CREATE INDEX publication_email_posts_publication_idx ON public.publication_email_posts USING btree (publication);
-- One on-subscribe email per audience (a free welcome and a paid welcome).
-- An 'all' email also overlaps the other two; saveEmailPost rejects that.
CREATE UNIQUE INDEX publication_email_posts_one_on_subscribe ON public.publication_email_posts USING btree (publication, audience) WHERE send_mode = 'on_subscribe';
CREATE INDEX publication_email_posts_image_paths_idx ON public.publication_email_posts USING gin (image_paths);

alter table "public"."publication_email_posts" add constraint "publication_email_posts_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON UPDATE CASCADE ON DELETE CASCADE;
alter table "public"."publication_email_posts" add constraint "publication_email_posts_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."publication_email_posts" add constraint "publication_email_posts_send_mode_check" CHECK (send_mode IN ('scheduled','on_subscribe'));
alter table "public"."publication_email_posts" add constraint "publication_email_posts_audience_check" CHECK (audience IN ('all','free','paid'));
alter table "public"."publication_email_posts" add constraint "publication_email_posts_status_check" CHECK (status IN ('scheduled','sending','sent','failed','paused','active'));
