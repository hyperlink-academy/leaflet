-- email_render_images ---------------------------------------------------------
-- Canvases in post emails are sent as images. Each row is the snapshot one
-- image is rendered from: the canvas content plus the theme, keyed by a hash
-- of both, so a key always names the same picture. The /email-render/<key>
-- page draws the snapshot, and the send screenshots it into storage
-- (email-renders/<key>.png), which /api/email-render/<key>.png serves.
create table "public"."email_render_images" (
    "key" text not null,
    "spec" jsonb not null,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."email_render_images" enable row level security;

CREATE UNIQUE INDEX email_render_images_pkey ON public.email_render_images USING btree (key);
alter table "public"."email_render_images" add constraint "email_render_images_pkey" PRIMARY KEY using index "email_render_images_pkey";
